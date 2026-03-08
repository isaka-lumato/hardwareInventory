export default function PrintPage({ params }: { params: { orderId: string } }) {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold">Print Invoice</h1>
      <p className="mt-2 text-gray-500">Order ID: {params.orderId}</p>
      <p className="mt-1 text-gray-400">Print layout will be built in Task 9.</p>
    </div>
  )
}
