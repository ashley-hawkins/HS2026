import { useState } from 'react'

export interface DriverDetails {
  surname: string
  forenames: string
  dob: string
  licenseRef: string
}

interface StageDriverDetailsProps {
  initialValues?: Partial<DriverDetails>
  onComplete: (details: DriverDetails) => void
}

export default function StageDriverDetails({ initialValues = {}, onComplete }: StageDriverDetailsProps) {
  const [surname, setSurname] = useState(initialValues.surname ?? '')
  const [forenames, setForenames] = useState(initialValues.forenames ?? '')
  const [dob, setDob] = useState(initialValues.dob ?? '')
  const [licenseRef, setLicenseRef] = useState(initialValues.licenseRef ?? '')

  const canSubmit = surname.trim() && forenames.trim() && dob && licenseRef.trim()

  function handleSubmit() {
    if (!canSubmit) return
    onComplete({ surname: surname.trim(), forenames: forenames.trim(), dob, licenseRef: licenseRef.trim() })
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Driver Details</h2>
        <p className="text-base-content/60 text-sm">Confirm or fill in the details from your licence</p>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <div className="form-control gap-1">
          <label className="label text-sm font-medium" htmlFor="dd-surname">Surname</label>
          <input
            id="dd-surname"
            data-field="surname"
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g. Smith"
            value={surname}
            onChange={e => setSurname(e.target.value)}
          />
        </div>

        <div className="form-control gap-1">
          <label className="label text-sm font-medium" htmlFor="dd-forenames">Forenames</label>
          <input
            id="dd-forenames"
            data-field="forenames"
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g. John Michael"
            value={forenames}
            onChange={e => setForenames(e.target.value)}
          />
        </div>

        <div className="form-control gap-1">
          <label className="label text-sm font-medium" htmlFor="dd-dob">Date of Birth</label>
          <input
            id="dd-dob"
            data-field="dob"
            type="date"
            className="input input-bordered w-full"
            value={dob}
            onChange={e => setDob(e.target.value)}
          />
        </div>

        <div className="form-control gap-1">
          <label className="label text-sm font-medium" htmlFor="dd-license">Driving Licence Ref</label>
          <input
            id="dd-license"
            data-field="licenseRef"
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g. SMITH751190JA9AB"
            value={licenseRef}
            onChange={e => setLicenseRef(e.target.value)}
          />
        </div>
      </div>

      <button
        className="btn btn-primary w-full"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        Continue
      </button>
    </div>
  )
}
