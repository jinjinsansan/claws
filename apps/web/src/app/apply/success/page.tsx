import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";

export default function ApplySuccessPage() {
  return (
    <div className="min-h-screen bg-bg text-text-main">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🎉</div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            お申し込み<span className="text-primary">ありがとうございます</span>
          </h1>
          <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-4">
            決済が正常に完了しました。
            <br className="hidden sm:block" />
            ご登録いただいたメールアドレスに確認メールをお送りしました。
          </p>
          <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-8 sm:mb-10">
            会員登録の案内メールが届きましたら、ログインして会員エリアをご利用ください。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/login" className="py-3 px-10">
              ログインページへ
            </Button>
            <Button href="/" variant="outline" className="py-3 px-10">
              トップページへ戻る
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
