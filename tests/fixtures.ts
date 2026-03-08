import { testSupabase } from './setup'

export async function createTestUser(role: 'cashier' | 'storekeeper' | 'admin' = 'cashier') {
  const email = `test-${role}-${Date.now()}@test.com`
  const password = 'testpassword123'

  const { data: authData, error: authError } = await testSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('Failed to create test user')

  // Update profile role
  const { error: profileError } = await testSupabase
    .from('profiles')
    .update({ name: `Test ${role}`, role })
    .eq('id', authData.user.id)

  if (profileError) throw profileError

  return {
    user: authData.user,
    email,
    password,
    cleanup: async () => {
      await testSupabase.auth.admin.deleteUser(authData.user.id)
    },
  }
}

export async function createTestProduct(overrides?: Record<string, unknown>) {
  const defaults = {
    name: `Test Product ${Date.now()}`,
    sku: `TST-${Date.now()}`,
    category_id: null as string | null,
    cost_price: 50000,
    selling_price: 75000,
    stock_quantity: 100,
    unit: 'piece',
    is_active: true,
  }

  // Get first category if no category_id provided
  if (!overrides?.category_id) {
    const { data: categories } = await testSupabase
      .from('categories')
      .select('id')
      .limit(1)
    if (categories && categories.length > 0) {
      defaults.category_id = categories[0].id
    }
  }

  const productData = { ...defaults, ...overrides }

  const { data, error } = await testSupabase
    .from('products')
    .insert(productData)
    .select()
    .single()

  if (error) throw error

  return {
    product: data,
    cleanup: async () => {
      await testSupabase.from('products').delete().eq('id', data.id)
    },
  }
}

export async function createTestOrder(
  cashierId: string,
  items: Array<{ product_id: string; product_name: string; quantity: number; unit_cost_price: number; unit_selling_price: number }>
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_selling_price, 0)

  const { data: order, error: orderError } = await testSupabase
    .from('orders')
    .insert({
      order_number: `TST-${Date.now()}`,
      cashier_id: cashierId,
      status: 'pending',
      payment_method: 'cash',
      subtotal,
      discount: 0,
      total: subtotal,
    })
    .select()
    .single()

  if (orderError) throw orderError

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_cost_price: item.unit_cost_price,
    unit_selling_price: item.unit_selling_price,
    line_total: item.quantity * item.unit_selling_price,
  }))

  const { error: itemsError } = await testSupabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) throw itemsError

  return {
    order,
    cleanup: async () => {
      await testSupabase.from('order_items').delete().eq('order_id', order.id)
      await testSupabase.from('orders').delete().eq('id', order.id)
    },
  }
}
