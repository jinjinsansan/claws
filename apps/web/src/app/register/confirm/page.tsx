import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";

export default function RegisterConfirmPage() {
  return (
    <div className="min-h-screen bg-bg text-text-main">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <div className="text-5xl mb-6">📧</div>
          <h1 className="font-serif text-2xl font-bold mb-4">
            確認メールを送信しました
          </h1>
          <p className="text-text-muted leading-relaxed mb-8">
            ご登録いただいたメールアドレスに確認メールを送信しました。
            メール内のリンクをクリックして、登録を完了してください。
          </p>
          <Button href="/login" variant="outline" className="py-3 px-8">
            ログインページへ
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
