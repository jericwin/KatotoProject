import { Save, RotateCcw } from 'lucide-react'
import { useSectionForm, useUnsavedGuard } from '../useSectionForm'
import { Field, PageHeader, Loading } from '../ui'

function Actions({ form }) {
  return (
    <div className="a-form__actions">
      <button type="button" className="a-btn a-btn--ghost" onClick={form.reset} disabled={!form.dirty || form.busy}>
        <RotateCcw aria-hidden="true" /> Undo edits
      </button>
      <button type="submit" className="a-btn" disabled={!form.dirty || form.busy}>
        <Save aria-hidden="true" /> {form.busy ? 'Saving…' : 'Save draft'}
      </button>
    </div>
  )
}

export default function ContactPage() {
  const contact = useSectionForm('contact')
  const donation = useSectionForm('donation')
  const legal = useSectionForm('legal')
  useUnsavedGuard(contact.dirty || donation.dirty || legal.dirty)
  if (!contact.ready || !donation.ready || !legal.ready) return <Loading />

  return (
    <>
      <PageHeader
        title="Contact & links"
        description="Official contact details shown in the Contact section, footer, and buttons across the site. Only enter verified details."
      />

      <form className="a-card a-form" onSubmit={contact.submit} noValidate>
        <h2 className="a-h2">Contact details</h2>
        <Field label="Email" type="email" value={contact.value.email} onChange={contact.set('email')} error={contact.errors.email} />
        <Field
          label="Phone (call or text)"
          hint="Shown as written, e.g. 0992 619 2807. Leave empty to hide."
          value={contact.value.phoneDisplay}
          onChange={contact.set('phoneDisplay')}
          error={contact.errors.phoneDisplay}
          inputMode="tel"
        />
        <Field
          label="Official Facebook page"
          value={contact.value.facebookUrl}
          onChange={contact.set('facebookUrl')}
          error={contact.errors.facebookUrl}
          inputMode="url"
        />
        <Field label="Location / address" value={contact.value.address} onChange={contact.set('address')} error={contact.errors.address} />
        <Actions form={contact} />
      </form>

      <form className="a-card a-form" onSubmit={donation.submit} noValidate>
        <h2 className="a-h2">Donation channel</h2>
        <p className="a-muted">Leave the channel or number empty to hide the donation card.</p>
        <div className="a-row">
          <Field label="Channel" hint="e.g. GCash" value={donation.value.channel} onChange={donation.set('channel')} error={donation.errors.channel} />
          <Field label="Number" value={donation.value.number} onChange={donation.set('number')} error={donation.errors.number} />
        </div>
        <Field label="Account name" value={donation.value.accountName} onChange={donation.set('accountName')} error={donation.errors.accountName} />
        <Actions form={donation} />
      </form>

      <form className="a-card a-form" onSubmit={legal.submit} noValidate>
        <h2 className="a-h2">Privacy contact</h2>
        <p className="a-muted">
          The Data Protection Officer named in the Privacy Policy. Leave empty until Katoto designates one; the policy then
          says none has been designated and points to the contact email.
        </p>
        <div className="a-row">
          <Field label="Data Protection Officer" value={legal.value.dpoName} onChange={legal.set('dpoName')} error={legal.errors.dpoName} maxLength={120} />
          <Field label="Their email" type="email" value={legal.value.dpoEmail} onChange={legal.set('dpoEmail')} error={legal.errors.dpoEmail} />
        </div>
        <Actions form={legal} />
      </form>
    </>
  )
}
