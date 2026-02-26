import ProductForm from "../ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">เพิ่มสินค้าใหม่</h1>
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-6 max-w-2xl">
        <ProductForm />
      </div>
    </div>
  );
}
