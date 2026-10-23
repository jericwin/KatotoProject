import { Save, RotateCcw } from 'lucide-react'
import { useSectionForm, useUnsavedGuard } from '../useSectionForm'
import { Field, ListEditor, PageHeader, Loading } from '../ui'
import { pillarText } from '../../data/pillarText'

function SaveButtons({ form }) {
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

export default function SiteContentPage() {
  const hero = useSectionForm('hero')
  const about = useSectionForm('about')
  const pillars = useSectionForm('pillars')
  useUnsavedGuard(hero.dirty || about.dirty || pillars.dirty)
  if (!hero.ready || !about.ready || !pillars.ready) return <Loading />

  return (
    <>
      <PageHeader
        title="Site content"
        description="Text for the homepage introduction, the About section, and the six pillars. Each block saves as a draft; publish from the top bar."
      />

      <form className="a-card a-form" onSubmit={hero.submit} noValidate>
        <h2 className="a-h2">Homepage introduction</h2>
        <Field
          label="Introduction under the headline"
          multiline
          rows={4}
          value={hero.value.lede}
          onChange={hero.set('lede')}
          error={hero.errors.lede}
          maxLength={600}
        />
        <SaveButtons form={hero} />
      </form>

      <form className="a-card a-form" onSubmit={about.submit} noValidate>
        <h2 className="a-h2">About Katoto</h2>
        <Field
          label="Opening paragraph"
          multiline
          rows={4}
          value={about.value.intro}
          onChange={about.set('intro')}
          error={about.errors.intro}
          maxLength={900}
        />
        <ListEditor
          label="More paragraphs"
          items={about.value.paragraphs}
          onChange={about.set('paragraphs')}
          makeItem={() => ''}
          addLabel="Add paragraph"
          max={4}
          min={1}
          errors={about.errors}
          prefix="paragraphs"
          render={(p, onChange, i) => (
            <Field label={`Paragraph ${i + 1}`} multiline rows={4} value={p} onChange={onChange} error={about.errors[`paragraphs.${i}`]} maxLength={1200} />
          )}
        />
        <SaveButtons form={about} />
      </form>

      <form className="a-card a-form" onSubmit={pillars.submit} noValidate>
        <h2 className="a-h2">The six pillars</h2>
        <p className="a-muted">Committee names, heads, and photos come from the official records and are not edited here.</p>
        {pillarText.map((p) => (
          <fieldset key={p.id} className="a-fieldset">
            <legend>{p.name}</legend>
            <Field
              label="Description"
              multiline
              rows={3}
              value={pillars.value[p.id]?.summary}
              onChange={(summary) => pillars.setValue((s) => ({ ...s, [p.id]: { ...s[p.id], summary } }))}
              error={pillars.errors[`${p.id}.summary`]}
              maxLength={900}
            />
            <Field
              label="Photo caption"
              value={pillars.value[p.id]?.caption}
              onChange={(caption) => pillars.setValue((s) => ({ ...s, [p.id]: { ...s[p.id], caption } }))}
              error={pillars.errors[`${p.id}.caption`]}
              maxLength={200}
            />
          </fieldset>
        ))}
        <SaveButtons form={pillars} />
      </form>
    </>
  )
}
