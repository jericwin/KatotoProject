import { Save, RotateCcw, AlertTriangle } from 'lucide-react'
import { useSectionForm, useUnsavedGuard } from '../useSectionForm'
import { Field, ListEditor, PageHeader, Loading } from '../ui'

export default function VolunteerPage() {
  const { value: v, set, errors, busy, dirty, submit, reset, ready } = useSectionForm('volunteer')
  useUnsavedGuard(dirty)
  if (!ready) return <Loading />

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title="Call for volunteers"
        description="The “Call for New Volunteers and Members” section on the homepage. Saving creates a draft; publish it from the top bar."
      >
        <button type="button" className="a-btn a-btn--ghost" onClick={reset} disabled={!dirty || busy}>
          <RotateCcw aria-hidden="true" /> Undo edits
        </button>
        <button type="submit" className="a-btn" disabled={!dirty || busy}>
          <Save aria-hidden="true" /> {busy ? 'Saving…' : 'Save draft'}
        </button>
      </PageHeader>

      <div className="a-card a-form">
        <h2 className="a-h2">Heading &amp; introduction</h2>
        <Field label="Small label above the heading" value={v.eyebrow} onChange={set('eyebrow')} error={errors.eyebrow} maxLength={60} />
        <Field label="Heading" value={v.heading} onChange={set('heading')} error={errors.heading} maxLength={140} />
        <Field label="Introduction" multiline rows={4} value={v.intro} onChange={set('intro')} error={errors.intro} maxLength={900} />
      </div>

      <div className="a-card a-form">
        <h2 className="a-h2">Qualifications</h2>
        <p className="a-muted">
          These are Katoto Project’s official qualifications. Change them only when the organization updates them.
        </p>
        <ListEditor
          label="Qualifications list"
          items={v.qualifications}
          onChange={set('qualifications')}
          makeItem={() => ''}
          addLabel="Add qualification"
          min={1}
          errors={errors}
          prefix="qualifications"
          render={(q, onChange, i) => (
            <Field label={`Qualification ${i + 1}`} value={q} onChange={onChange} error={errors[`qualifications.${i}`]} maxLength={300} />
          )}
        />
      </div>

      <div className="a-card a-form">
        <h2 className="a-h2">How to apply</h2>
        <Field label="Steps heading" value={v.stepsTitle} onChange={set('stepsTitle')} error={errors.stepsTitle} maxLength={80} />
        <ListEditor
          label="Application steps"
          items={v.steps}
          onChange={set('steps')}
          makeItem={() => ({ title: '', body: '' })}
          addLabel="Add step"
          max={8}
          errors={errors}
          prefix="steps"
          render={(s, onChange, i) => (
            <>
              <Field label="Step title" value={s.title} onChange={(title) => onChange({ ...s, title })} error={errors[`steps.${i}.title`]} maxLength={120} />
              <Field
                label="Details"
                multiline
                rows={2}
                value={s.body}
                onChange={(body) => onChange({ ...s, body })}
                error={errors[`steps.${i}.body`]}
                maxLength={500}
              />
            </>
          )}
        />
      </div>

      <div className="a-card a-form">
        <h2 className="a-h2">Application button</h2>
        {!v.applyUrl && (
          <p className="admin-alert admin-alert--warn">
            <AlertTriangle aria-hidden="true" />
            No application link is set. Visitors will see “The online application isn’t open yet” instead of a button.
          </p>
        )}
        <Field label="Button label" value={v.applyLabel} onChange={set('applyLabel')} error={errors.applyLabel} maxLength={60} />
        <Field
          label="Application link"
          hint="An official application form (e.g. a Google Form), the Facebook page, or a mailto: link. Must start with https://, mailto:, or tel:. Leave empty to show a “not open yet” notice."
          value={v.applyUrl}
          onChange={set('applyUrl')}
          error={errors.applyUrl}
          inputMode="url"
        />
        <Field
          label="Note under the button"
          multiline
          rows={2}
          value={v.applyNote}
          onChange={set('applyNote')}
          error={errors.applyNote}
          maxLength={500}
        />
        <div className="a-row">
          <Field label="Second button label" value={v.secondaryLabel} onChange={set('secondaryLabel')} error={errors.secondaryLabel} maxLength={60} />
          <Field
            label="Second button link"
            hint="Optional, e.g. mailto:katotoprojectofficial@gmail.com"
            value={v.secondaryUrl}
            onChange={set('secondaryUrl')}
            error={errors.secondaryUrl}
          />
        </div>
      </div>
    </form>
  )
}
