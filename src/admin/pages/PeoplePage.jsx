import { Save, RotateCcw } from 'lucide-react'
import { useSectionForm, useUnsavedGuard } from '../useSectionForm'
import { Field, ListEditor, PageHeader, Loading } from '../ui'
import { pillarText } from '../../data/pillarText'

export default function PeoplePage() {
  const { value: v, set, setValue, errors, busy, dirty, submit, reset, ready } = useSectionForm('people')
  useUnsavedGuard(dirty)
  if (!ready) return <Loading />

  const setCommittee = (id, key) => (val) =>
    setValue((s) => ({ ...s, committees: { ...s.committees, [id]: { ...s.committees[id], [key]: val } } }))

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title="Officers & committees"
        description="Officers, barangay coordinators, and committee heads shown on the homepage. Saving creates a draft; publish it from the top bar."
      >
        <button type="button" className="a-btn a-btn--ghost" onClick={reset} disabled={!dirty || busy}>
          <RotateCcw aria-hidden="true" /> Undo edits
        </button>
        <button type="submit" className="a-btn" disabled={!dirty || busy}>
          <Save aria-hidden="true" /> {busy ? 'Saving…' : 'Save draft'}
        </button>
      </PageHeader>

      <div className="a-card a-form">
        <h2 className="a-h2">Term</h2>
        <Field
          label="Term of office"
          hint="Shown with the officers and committee leads, e.g. “August 22 – December 31, 2026”. Leave empty to hide."
          value={v.term}
          onChange={set('term')}
          error={errors.term}
          maxLength={80}
        />
      </div>

      <div className="a-card a-form">
        <h2 className="a-h2">Committee heads</h2>
        <p className="a-muted">One committee per pillar. Leave a name empty to hide that line on the website.</p>
        <div className="a-committees">
          {pillarText.map((p) => (
            <fieldset key={p.id} className="a-fieldset">
              <legend>{p.name}</legend>
              <div className="a-row">
                <Field
                  label="Committee head"
                  value={v.committees?.[p.id]?.head}
                  onChange={setCommittee(p.id, 'head')}
                  error={errors[`committees.${p.id}.head`]}
                  maxLength={120}
                />
                <Field
                  label="Assistant head"
                  value={v.committees?.[p.id]?.assistant}
                  onChange={setCommittee(p.id, 'assistant')}
                  error={errors[`committees.${p.id}.assistant`]}
                  maxLength={120}
                />
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="a-card a-form">
        <h2 className="a-h2">Officers</h2>
        <p className="a-muted">Grouped as on the website, e.g. Executive Committee, Finance &amp; Property, Transparency.</p>
        <ListEditor
          label="Officer groups"
          items={v.groups}
          onChange={set('groups')}
          makeItem={() => ({ name: '', members: [{ role: '', name: '' }] })}
          addLabel="Add group"
          max={12}
          errors={errors}
          prefix="groups"
          render={(g, onChange, gi) => (
            <>
              <Field label="Group name" value={g.name} onChange={(name) => onChange({ ...g, name })} error={errors[`groups.${gi}.name`]} maxLength={80} />
              <ListEditor
                label={`People in ${g.name || `group ${gi + 1}`}`}
                items={g.members}
                onChange={(members) => onChange({ ...g, members })}
                makeItem={() => ({ role: '', name: '' })}
                addLabel="Add person"
                max={20}
                min={1}
                errors={errors}
                prefix={`groups.${gi}.members`}
                render={(m, onMember, mi) => (
                  <div className="a-row">
                    <Field
                      label="Position"
                      value={m.role}
                      onChange={(role) => onMember({ ...m, role })}
                      error={errors[`groups.${gi}.members.${mi}.role`]}
                      maxLength={100}
                    />
                    <Field
                      label="Name"
                      value={m.name}
                      onChange={(name) => onMember({ ...m, name })}
                      error={errors[`groups.${gi}.members.${mi}.name`]}
                      maxLength={120}
                    />
                  </div>
                )}
              />
            </>
          )}
        />
      </div>

      <div className="a-card a-form">
        <h2 className="a-h2">Barangay coordinators</h2>
        <ListEditor
          label="Coordinators"
          items={v.coordinators}
          onChange={set('coordinators')}
          makeItem={() => ({ area: '', name: '' })}
          addLabel="Add coordinator"
          max={30}
          errors={errors}
          prefix="coordinators"
          render={(c, onChange, i) => (
            <div className="a-row">
              <Field
                label="Barangay or area"
                value={c.area}
                onChange={(area) => onChange({ ...c, area })}
                error={errors[`coordinators.${i}.area`]}
                maxLength={60}
              />
              <Field
                label="Coordinator"
                value={c.name}
                onChange={(name) => onChange({ ...c, name })}
                error={errors[`coordinators.${i}.name`]}
                maxLength={120}
              />
            </div>
          )}
        />
      </div>
    </form>
  )
}
