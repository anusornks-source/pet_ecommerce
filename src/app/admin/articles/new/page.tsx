import ArticleForm from "../ArticleForm";

export default function NewArticlePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">เพิ่มบทความใหม่</h1>
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <ArticleForm />
      </div>
    </div>
  );
}
