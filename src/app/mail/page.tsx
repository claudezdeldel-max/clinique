import { Mail } from "@/app/mail/components/mail"
import { accounts, mails } from "@/app/mail/data"
import { BaseLayout } from "@/components/layouts/base-layout"

export default function MailPage() {
  return (
    <BaseLayout title="Comptes-rendus" description="Clichés, rapports et ordonnances">
      <div className="@container/main flex flex-1 flex-col">
        <div className="h-[calc(100vh-4rem)] px-4 md:px-6">
          <Mail
            accounts={accounts}
            mails={mails}
            defaultLayout={[20, 32, 48]}
            defaultCollapsed={false}
            navCollapsedSize={4}
          />
        </div>
      </div>
    </BaseLayout>
  )
}
