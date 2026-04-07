import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// Step 1: Hours Not Worked options
const HOURS_NOT_WORKED_OPTIONS = [
  { id: 'vacation', label: 'Vacation' },
  { id: 'sick-time', label: 'Sick Time' },
  { id: 'holidays', label: 'Holidays' }
]

// Step 1: Non-Billable Hours options
const NON_BILLABLE_HOURS_OPTIONS = [
  { id: 'training', label: 'Training' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'drive-time', label: 'Drive Time', tooltip: 'Not billed to job' },
  { id: 'rework', label: 'Rework' },
  { id: 'administration', label: 'Admin' },
  { id: 'downtime-cleaning', label: 'Downtime/Cleaning' },
  { id: 'minimum-weekly-hours', label: 'Minimum Weekly Hours' }
]

// Step 2: Mandatory Payroll Tax Burden options
const MANDATORY_PAYROLL_TAX_OPTIONS = [
  { id: 'federal-taxes', label: 'Federal Taxes', defaultPercent: 0 },
  { id: 'social-security', label: 'Social Security', defaultPercent: 0 },
  { id: 'medicare', label: 'Medicare', defaultPercent: 0 }
]

// Step 2: Mandatory Worker Burden options
const MANDATORY_WORKER_BURDEN_OPTIONS = [
  { id: 'state-unemployment', label: 'State Unemployment', defaultPercent: 0 },
  { id: 'federal-unemployment', label: 'Federal Unemployment', defaultPercent: 0 },
  { id: 'workers-compensation', label: 'Workers Compensation', defaultPercent: 0 }
]

// Step 2: Benefits Burden options
const BENEFITS_BURDEN_OPTIONS = [
  { id: 'health-insurance', label: 'Health Insurance Premiums', defaultPercent: 0 },
  { id: 'retirement-match', label: 'Retirement Match', defaultPercent: 0 }
]

// Step 2: Additional Overheads options
const ADDITIONAL_OVERHEADS_OPTIONS = [
  { id: 'uniforms', label: 'Uniforms', defaultPercent: 0 },
  { id: 'boot-allowance', label: 'Boot Allowance', defaultPercent: 0 },
  { id: 'phone-data', label: 'Phone & Data', defaultPercent: 0 },
  { id: 'computer-tablet', label: 'Computer / Tablet & Software', defaultPercent: 0 }
]

// Step 2: Employee Costs options
const EMPLOYEE_COSTS_OPTIONS = [
  { id: 'training-certifications', label: 'Training & Certifications', defaultPercent: 0 },
  { id: 'christmas-bonus', label: 'Christmas Bonus', defaultPercent: 0 },
  { id: 'performance-bonus', label: 'Performance Bonus', defaultPercent: 0 },
  { id: 'non-billable-tools', label: 'Other: Non-Billable Tools', defaultPercent: 0 }
]

const PAID_CAPACITY = 2080 // 52 weeks * 40 hours

/** Default calculator fields for a new employee (snapshot merge target). */
function createDefaultCalculatorSnapshot() {
  return {
    employeeName: '',
    hoursNotWorked: {},
    nonBillableHours: {},
    customHoursNotWorked: [],
    newCustomHoursNotWorked: '',
    customNonBillable: [],
    newCustomNonBillable: '',
    workersWage: '',
    mandatoryPayrollTaxPercents: Object.fromEntries(
      MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [opt.id, opt.defaultPercent])
    ),
    mandatoryWorkerBurdenPercents: Object.fromEntries(
      MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => [opt.id, opt.defaultPercent])
    ),
    customPayrollTaxFields: [],
    customWorkerBurdenFields: [],
    newCustomPayrollTax: { name: '', percent: 0 },
    newCustomWorkerBurden: { name: '', percent: 0 },
    benefitsBurdenPercents: Object.fromEntries(
      BENEFITS_BURDEN_OPTIONS.map(opt => [opt.id, opt.defaultPercent])
    ),
    customBenefitsBurdenFields: [],
    newCustomBenefitsBurden: { name: '', percent: 0 },
    additionalOverheadsPercents: Object.fromEntries(
      ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [opt.id, opt.defaultPercent])
    ),
    customAdditionalOverheadsFields: [],
    newCustomAdditionalOverheads: { name: '', percent: 0 },
    employeeCostsPercents: Object.fromEntries(
      EMPLOYEE_COSTS_OPTIONS.map(opt => [opt.id, opt.defaultPercent])
    ),
    customEmployeeCosts: [],
    newCustomEmployeeCost: { name: '', percent: 0 },
    divisionOverheadPercent: 0,
    generalCompanyOverheadPercent: 0,
    profitPercent: 0
  }
}

/** Default cross-employee locks requested for Step 2/3 inputs. */
function createDefaultFieldLocks() {
  const locks = {}

  MANDATORY_PAYROLL_TAX_OPTIONS.forEach(opt => {
    locks[`payrollTax:${opt.id}:brdn`] = { locked: true, value: opt.defaultPercent ?? 0 }
  })
  MANDATORY_WORKER_BURDEN_OPTIONS.forEach(opt => {
    locks[`workerBurden:${opt.id}:brdn`] = { locked: true, value: opt.defaultPercent ?? 0 }
  })

  BENEFITS_BURDEN_OPTIONS.forEach(opt => {
    locks[`benefits:${opt.id}:brdn`] = { locked: true, value: opt.defaultPercent ?? 0 }
  })
  ADDITIONAL_OVERHEADS_OPTIONS.forEach(opt => {
    locks[`additionalOverheads:${opt.id}:annual`] = { locked: true, value: 0 }
  })
  EMPLOYEE_COSTS_OPTIONS.forEach(opt => {
    locks[`employeeCosts:${opt.id}:annual`] = { locked: true, value: 0 }
  })

  return locks
}

/**
 * Working on option text: real name; or numbered placeholders only until someone is named;
 * once any employee has a name, unnamed rows use no placeholder text.
 */
function workingOnOptionLabel(storedName, indexOneBased, hasAnyNamedEmployee) {
  const n = (storedName || '').trim()
  if (n) return n
  if (hasAnyNamedEmployee) return ''
  return `New employee ${indexOneBased}`
}

// Step 2: Brdn / Hrly / Spend — fixed width = columns + gap-1.5×2 (headers, rows, totals share one track)
const STEP2_BURDEN_WRAP = 'w-[11.5rem] max-w-full shrink-0'
const STEP2_BURDEN_GRID = 'grid w-full min-w-0 grid-cols-[3.25rem_3.25rem_5rem] gap-1.5'
// Step 3: three-column burden grid (same as Division / General / Profit overhead rows)
const STEP3_BURDEN3_WRAP = 'w-[11.75rem] max-w-full shrink-0'
const STEP3_BURDEN3_GRID = 'grid w-full min-w-0 grid-cols-[3rem_3rem_5rem] gap-1.5'

/** Spend/yr ($): annual cost = earned burden $/hr × paid hours/year (2080). */
function annualSpendFromEarnedHourly(earnedHrly) {
  return earnedHrly * PAID_CAPACITY
}

/**
 * Step 3 overhead annual ($/yr) = H×R/(1−p) − H×R
 * H = total hours available for work, R = total labor $/hr before this overhead layer
 * (Division: before any step 3 overhead; General: includes division overhead), p = overhead % as decimal.
 */
function overheadAnnualFromFormula(totalHoursAvailable, laborRateBeforeThisOverhead, overheadPercent) {
  const H = parseFloat(totalHoursAvailable) || 0
  const R = parseFloat(laborRateBeforeThisOverhead) || 0
  const p = (parseFloat(overheadPercent) || 0) / 100
  if (H <= 0 || p <= 0 || p >= 1 || !Number.isFinite(R)) return 0
  return (H * R) / (1 - p) - H * R
}

/** Brdn % from earned burden $/hr vs workers wage, rounded to 2 decimals. */
function burdenPercentFromEarnedHourly(earnedHrly, workersWage) {
  const w = parseFloat(workersWage) || 0
  if (w <= 0 || !Number.isFinite(earnedHrly)) return 0
  const pct = (earnedHrly / w) * 100
  return Math.round(pct * 100) / 100
}

/** $/hr burden amounts rounded to 2 decimals. */
function roundBurdenDollar(x) {
  return Math.round(x * 100) / 100
}

/** Two-decimal display for Brdn % inputs; full precision stays in state until user edits this field. */
function formatBrdnPercentForDisplay(stored) {
  if (stored === '' || stored === undefined || stored === null) return ''
  const n = parseFloat(stored)
  if (Number.isNaN(n)) return ''
  const rounded = Math.round(n * 100) / 100
  if (rounded === 0) return ''
  return rounded.toFixed(2)
}

/**
 * Resolves Brdn % from optional :brdn / :hrly / :annual locks (wage-based burden rows).
 * Legacy: a lock stored at basePath without suffix is treated as :brdn.
 */
function resolveWageBurdenPercentFromLocks(fieldLocks, basePath, snapshotPercent, workersWage) {
  const w = parseFloat(workersWage) || 0
  const legacy = fieldLocks[basePath]
  const brdn = fieldLocks[`${basePath}:brdn`] ?? (legacy?.locked ? legacy : null)
  const hrly = fieldLocks[`${basePath}:hrly`]
  const annual = fieldLocks[`${basePath}:annual`]
  if (brdn?.locked) {
    const val = brdn.value
    if (val === '' || val === undefined) return ''
    const n = parseFloat(val)
    return Number.isNaN(n) ? '' : Math.round(n * 100) / 100
  }
  if (hrly?.locked && w > 0) {
    const h = parseFloat(hrly.value)
    if (!Number.isNaN(h) && h >= 0) return burdenPercentFromEarnedHourly(h, w)
  }
  if (annual?.locked && w > 0) {
    const a = parseFloat(annual.value)
    if (!Number.isNaN(a) && a >= 0) {
      const earnedHrly = a / PAID_CAPACITY
      return burdenPercentFromEarnedHourly(earnedHrly, w)
    }
  }
  return snapshotPercent
}

function applyWageBurdenRowLocks(o, fieldLocks) {
  const w = o.workersWage
  for (const opt of MANDATORY_PAYROLL_TAX_OPTIONS) {
    const id = opt.id
    o.mandatoryPayrollTaxPercents[id] = resolveWageBurdenPercentFromLocks(
      fieldLocks,
      `payrollTax:${id}`,
      o.mandatoryPayrollTaxPercents[id],
      w
    )
  }
  o.customPayrollTaxFields = o.customPayrollTaxFields.map((field, idx) => ({
    ...field,
    percent: resolveWageBurdenPercentFromLocks(fieldLocks, `customPayrollTax:${idx}`, field.percent, w)
  }))
  for (const opt of MANDATORY_WORKER_BURDEN_OPTIONS) {
    const id = opt.id
    o.mandatoryWorkerBurdenPercents[id] = resolveWageBurdenPercentFromLocks(
      fieldLocks,
      `workerBurden:${id}`,
      o.mandatoryWorkerBurdenPercents[id],
      w
    )
  }
  o.customWorkerBurdenFields = o.customWorkerBurdenFields.map((field, idx) => ({
    ...field,
    percent: resolveWageBurdenPercentFromLocks(fieldLocks, `customWorkerBurden:${idx}`, field.percent, w)
  }))
  for (const opt of BENEFITS_BURDEN_OPTIONS) {
    o.benefitsBurdenPercents[opt.id] = resolveWageBurdenPercentFromLocks(
      fieldLocks,
      `benefits:${opt.id}`,
      o.benefitsBurdenPercents[opt.id],
      w
    )
  }
  o.customBenefitsBurdenFields = o.customBenefitsBurdenFields.map((field, idx) => ({
    ...field,
    percent: resolveWageBurdenPercentFromLocks(fieldLocks, `customBenefits:${idx}`, field.percent, w)
  }))
  for (const opt of ADDITIONAL_OVERHEADS_OPTIONS) {
    o.additionalOverheadsPercents[opt.id] = resolveWageBurdenPercentFromLocks(
      fieldLocks,
      `additionalOverheads:${opt.id}`,
      o.additionalOverheadsPercents[opt.id],
      w
    )
  }
  o.customAdditionalOverheadsFields = o.customAdditionalOverheadsFields.map((field, idx) => ({
    ...field,
    percent: resolveWageBurdenPercentFromLocks(fieldLocks, `customAdditionalOverheads:${idx}`, field.percent, w)
  }))
  for (const opt of EMPLOYEE_COSTS_OPTIONS) {
    o.employeeCostsPercents[opt.id] = resolveWageBurdenPercentFromLocks(
      fieldLocks,
      `employeeCosts:${opt.id}`,
      o.employeeCostsPercents[opt.id],
      w
    )
  }
  o.customEmployeeCosts = o.customEmployeeCosts.map((cost, idx) => ({
    ...cost,
    percent: resolveWageBurdenPercentFromLocks(fieldLocks, `customEmployeeCosts:${idx}`, cost.percent, w)
  }))
}

/**
 * Applies cross-employee locked field values onto a calculator snapshot / state shape.
 * fieldLocks: { [path]: { locked: true, value } }
 * Wage-based burden rows use suffixes :brdn, :hrly, :annual (see resolveWageBurdenPercentFromLocks).
 */
function applyFieldLocksToMergedSnapshot(fieldLocks, m) {
  const o = {
    ...m,
    hoursNotWorked: { ...m.hoursNotWorked },
    nonBillableHours: { ...m.nonBillableHours },
    mandatoryPayrollTaxPercents: { ...m.mandatoryPayrollTaxPercents },
    mandatoryWorkerBurdenPercents: { ...m.mandatoryWorkerBurdenPercents },
    benefitsBurdenPercents: { ...m.benefitsBurdenPercents },
    additionalOverheadsPercents: { ...m.additionalOverheadsPercents },
    employeeCostsPercents: { ...m.employeeCostsPercents },
    customPayrollTaxFields: m.customPayrollTaxFields.map(f => ({ ...f })),
    customWorkerBurdenFields: m.customWorkerBurdenFields.map(f => ({ ...f })),
    customBenefitsBurdenFields: m.customBenefitsBurdenFields.map(f => ({ ...f })),
    customAdditionalOverheadsFields: m.customAdditionalOverheadsFields.map(f => ({ ...f })),
    customEmployeeCosts: m.customEmployeeCosts.map(c => ({ ...c }))
  }
  for (const [path, meta] of Object.entries(fieldLocks)) {
    if (!meta?.locked || meta.value === undefined) continue
    const v = meta.value
    if (path === 'workersWage') o.workersWage = v
    else if (path === 'divisionOverheadPercent' || path === 'divisionOverheadPercent:brdn') o.divisionOverheadPercent = v
    else if (path === 'generalCompanyOverheadPercent' || path === 'generalCompanyOverheadPercent:brdn') o.generalCompanyOverheadPercent = v
    else if (path === 'profitPercent' || path === 'profitPercent:brdn') o.profitPercent = v
    else if (path.startsWith('hoursNotWorked:')) o.hoursNotWorked[path.slice('hoursNotWorked:'.length)] = v
    else if (path.startsWith('nonBillableHours:')) o.nonBillableHours[path.slice('nonBillableHours:'.length)] = v
  }
  applyWageBurdenRowLocks(o, fieldLocks)
  return o
}

/** Lock under an input: same value for every employee when locked (closed lock). */
function FieldLockButton({ locked, onToggle }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        onToggle()
      }}
      className={`shrink-0 p-0.5 rounded border transition-colors ${
        locked
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400 hover:text-gray-600'
      }`}
      title={locked ? 'Unlock: use a different value per employee' : 'Lock: keep this value when switching employees'}
      aria-pressed={locked}
      aria-label={locked ? 'Field locked for all employees' : 'Lock field for all employees'}
    >
      {locked ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a5 5 0 00-5 5v2H4a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 7V7a3 3 0 116 0v2H7z" />
        </svg>
      )}
    </button>
  )
}

// Shows (?) tooltip only when the label is truncated (e.g. shows "..."). User can hover to read full label.
// Tooltip is rendered via portal (like Division Overhead) so it always sits on top and is never clipped.
function TruncatedLabelWithTooltip({ label, fullText, labelClassName, wrapperClassName = 'flex items-center gap-1.5 min-w-0 overflow-hidden' }) {
  const labelRef = useRef(null)
  const triggerRef = useRef(null)
  const [showIcon, setShowIcon] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  useEffect(() => {
    const el = labelRef.current
    if (!el) return
    const check = () => setShowIcon(el.scrollHeight > el.clientHeight)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [label])
  const updateTooltipPos = () => {
    const el = triggerRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      setTooltipPos({ top: rect.top, left: rect.left + rect.width / 2 })
    }
  }
  return (
    <div className={wrapperClassName}>
      <label ref={labelRef} className={labelClassName}>
        {label}
      </label>
      {showIcon && (
        <div
          ref={triggerRef}
          className="relative flex-shrink-0"
          onMouseEnter={() => { updateTooltipPos(); setTooltipOpen(true) }}
          onMouseLeave={() => setTooltipOpen(false)}
        >
          <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
      {tooltipOpen && createPortal(
        <div
          role="tooltip"
          className="w-48 max-w-[220px] p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-normal pointer-events-none"
          style={{
            position: 'fixed',
            left: tooltipPos.left,
            top: tooltipPos.top - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999
          }}
        >
          {fullText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>,
        document.body
      )}
        </div>
      )}
    </div>
  )
}

function LaborRateCalculator() {
  // Employee identity & multi-employee snapshots (separate calculator per person)
  const [employeeName, setEmployeeName] = useState('')
  const [employeeRoster, setEmployeeRoster] = useState([{ id: 'emp-1', name: '' }])
  const [activeEmployeeId, setActiveEmployeeId] = useState('emp-1')
  const employeeSnapshotsRef = useRef({})

  // Step 1: Hours data
  const [hoursNotWorked, setHoursNotWorked] = useState({})
  const [nonBillableHours, setNonBillableHours] = useState({})
  const [customHoursNotWorked, setCustomHoursNotWorked] = useState([])
  const [newCustomHoursNotWorked, setNewCustomHoursNotWorked] = useState('')
  const [customNonBillable, setCustomNonBillable] = useState([])
  const [newCustomNonBillable, setNewCustomNonBillable] = useState('')
  
  // Step 2: Employee earned data
  const [workersWage, setWorkersWage] = useState('')
  const [mandatoryPayrollTaxPercents, setMandatoryPayrollTaxPercents] = useState(
    Object.fromEntries(MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [mandatoryWorkerBurdenPercents, setMandatoryWorkerBurdenPercents] = useState(
    Object.fromEntries(MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [customPayrollTaxFields, setCustomPayrollTaxFields] = useState([])
  const [customWorkerBurdenFields, setCustomWorkerBurdenFields] = useState([])
  const [newCustomPayrollTax, setNewCustomPayrollTax] = useState({ name: '', percent: 0 })
  const [newCustomWorkerBurden, setNewCustomWorkerBurden] = useState({ name: '', percent: 0 })
  const [benefitsBurdenPercents, setBenefitsBurdenPercents] = useState(
    Object.fromEntries(BENEFITS_BURDEN_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [customBenefitsBurdenFields, setCustomBenefitsBurdenFields] = useState([])
  const [newCustomBenefitsBurden, setNewCustomBenefitsBurden] = useState({ name: '', percent: 0 })
  const [additionalOverheadsPercents, setAdditionalOverheadsPercents] = useState(
    Object.fromEntries(ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [customAdditionalOverheadsFields, setCustomAdditionalOverheadsFields] = useState([])
  const [newCustomAdditionalOverheads, setNewCustomAdditionalOverheads] = useState({ name: '', percent: 0 })
  const [employeeCostsPercents, setEmployeeCostsPercents] = useState(
    Object.fromEntries(EMPLOYEE_COSTS_OPTIONS.map(opt => [opt.id, opt.defaultPercent]))
  )
  const [customEmployeeCosts, setCustomEmployeeCosts] = useState([])
  const [newCustomEmployeeCost, setNewCustomEmployeeCost] = useState({ name: '', percent: 0 })
  
  // Step 3: Overhead and Profit
  const [divisionOverheadPercent, setDivisionOverheadPercent] = useState(0)
  const [generalCompanyOverheadPercent, setGeneralCompanyOverheadPercent] = useState(0)
  const [profitPercent, setProfitPercent] = useState(0)

  // Local editing state for Hrly ($) / Spend/yr ($) so user can type decimals without value snapping on each keystroke
  const [editingDollarField, setEditingDollarField] = useState(null) // { section, rowId, field: 'hrly'|'chgd', value: string }
  const [editingBrdnField, setEditingBrdnField] = useState(null) // { key: string, value: string }

  /** Cross-employee locks: when locked, value is reused for every employee (path -> { locked, value }). */
  const [fieldLocks, setFieldLocks] = useState(createDefaultFieldLocks)

  const toggleFieldLock = useCallback((path, readCurrentValue) => {
    setFieldLocks(prev => {
      const cur = prev[path]
      if (cur?.locked) {
        const next = { ...prev }
        delete next[path]
        return next
      }
      return { ...prev, [path]: { locked: true, value: readCurrentValue() } }
    })
  }, [])

  const updateFieldLockValue = useCallback((path, value) => {
    setFieldLocks(prev => {
      if (!prev[path]?.locked) return prev
      return { ...prev, [path]: { locked: true, value } }
    })
  }, [])

  const getAnnualInputDisplay = useCallback((lockPath, computedAnnual) => {
    const lockMeta = fieldLocks[lockPath]
    if (lockMeta?.locked) {
      const n = parseFloat(lockMeta.value)
      return !Number.isNaN(n) && n > 0 ? n.toFixed(2) : ''
    }
    return computedAnnual > 0 ? computedAnnual.toFixed(2) : ''
  }, [fieldLocks])

  const collectCalculatorSnapshot = useCallback(() => ({
    employeeName,
    hoursNotWorked,
    nonBillableHours,
    customHoursNotWorked,
    newCustomHoursNotWorked,
    customNonBillable,
    newCustomNonBillable,
    workersWage,
    mandatoryPayrollTaxPercents,
    mandatoryWorkerBurdenPercents,
    customPayrollTaxFields,
    customWorkerBurdenFields,
    newCustomPayrollTax,
    newCustomWorkerBurden,
    benefitsBurdenPercents,
    customBenefitsBurdenFields,
    newCustomBenefitsBurden,
    additionalOverheadsPercents,
    customAdditionalOverheadsFields,
    newCustomAdditionalOverheads,
    employeeCostsPercents,
    customEmployeeCosts,
    newCustomEmployeeCost,
    divisionOverheadPercent,
    generalCompanyOverheadPercent,
    profitPercent
  }), [
    employeeName,
    hoursNotWorked,
    nonBillableHours,
    customHoursNotWorked,
    newCustomHoursNotWorked,
    customNonBillable,
    newCustomNonBillable,
    workersWage,
    mandatoryPayrollTaxPercents,
    mandatoryWorkerBurdenPercents,
    customPayrollTaxFields,
    customWorkerBurdenFields,
    newCustomPayrollTax,
    newCustomWorkerBurden,
    benefitsBurdenPercents,
    customBenefitsBurdenFields,
    newCustomBenefitsBurden,
    additionalOverheadsPercents,
    customAdditionalOverheadsFields,
    newCustomAdditionalOverheads,
    employeeCostsPercents,
    customEmployeeCosts,
    newCustomEmployeeCost,
    divisionOverheadPercent,
    generalCompanyOverheadPercent,
    profitPercent
  ])

  const applyCalculatorSnapshot = useCallback((raw) => {
    const m0 = { ...createDefaultCalculatorSnapshot(), ...raw }
    const m = applyFieldLocksToMergedSnapshot(fieldLocks, m0)
    setEmployeeName(m.employeeName)
    setHoursNotWorked(m.hoursNotWorked)
    setNonBillableHours(m.nonBillableHours)
    setCustomHoursNotWorked(m.customHoursNotWorked)
    setNewCustomHoursNotWorked(m.newCustomHoursNotWorked)
    setCustomNonBillable(m.customNonBillable)
    setNewCustomNonBillable(m.newCustomNonBillable)
    setWorkersWage(m.workersWage)
    setMandatoryPayrollTaxPercents(m.mandatoryPayrollTaxPercents)
    setMandatoryWorkerBurdenPercents(m.mandatoryWorkerBurdenPercents)
    setCustomPayrollTaxFields(m.customPayrollTaxFields)
    setCustomWorkerBurdenFields(m.customWorkerBurdenFields)
    setNewCustomPayrollTax(m.newCustomPayrollTax)
    setNewCustomWorkerBurden(m.newCustomWorkerBurden)
    setBenefitsBurdenPercents(m.benefitsBurdenPercents)
    setCustomBenefitsBurdenFields(m.customBenefitsBurdenFields)
    setNewCustomBenefitsBurden(m.newCustomBenefitsBurden)
    setAdditionalOverheadsPercents(m.additionalOverheadsPercents)
    setCustomAdditionalOverheadsFields(m.customAdditionalOverheadsFields)
    setNewCustomAdditionalOverheads(m.newCustomAdditionalOverheads)
    setEmployeeCostsPercents(m.employeeCostsPercents)
    setCustomEmployeeCosts(m.customEmployeeCosts)
    setNewCustomEmployeeCost(m.newCustomEmployeeCost)
    setDivisionOverheadPercent(m.divisionOverheadPercent)
    setGeneralCompanyOverheadPercent(m.generalCompanyOverheadPercent)
    setProfitPercent(m.profitPercent)
    setEditingDollarField(null)
    setEditingBrdnField(null)
  }, [fieldLocks])

  const switchToEmployee = useCallback((newId) => {
    if (newId === activeEmployeeId) return
    employeeSnapshotsRef.current[activeEmployeeId] = collectCalculatorSnapshot()
    const next = employeeSnapshotsRef.current[newId] ?? createDefaultCalculatorSnapshot()
    applyCalculatorSnapshot(next)
    setActiveEmployeeId(newId)
  }, [activeEmployeeId, collectCalculatorSnapshot, applyCalculatorSnapshot, employeeName])

  const addEmployee = useCallback(() => {
    employeeSnapshotsRef.current[activeEmployeeId] = collectCalculatorSnapshot()
    const newId = `emp-${Date.now()}`
    setEmployeeRoster(prev => [...prev, { id: newId, name: '' }])
    applyCalculatorSnapshot(createDefaultCalculatorSnapshot())
    setActiveEmployeeId(newId)
  }, [activeEmployeeId, collectCalculatorSnapshot, applyCalculatorSnapshot])

  const removeActiveEmployee = useCallback(() => {
    if (employeeRoster.length <= 1) return
    employeeSnapshotsRef.current[activeEmployeeId] = collectCalculatorSnapshot()
    const idx = employeeRoster.findIndex(e => e.id === activeEmployeeId)
    const others = employeeRoster.filter(e => e.id !== activeEmployeeId)
    delete employeeSnapshotsRef.current[activeEmployeeId]
    const nextId = idx > 0 ? others[idx - 1].id : others[0].id
    setEmployeeRoster(others)
    const next = employeeSnapshotsRef.current[nextId] ?? createDefaultCalculatorSnapshot()
    applyCalculatorSnapshot(next)
    setActiveEmployeeId(nextId)
  }, [employeeRoster, activeEmployeeId, collectCalculatorSnapshot, applyCalculatorSnapshot])

  // Keep roster names aligned with the Employee name field so "Working on" shows the typed name immediately (not "Employee N").
  useEffect(() => {
    setEmployeeRoster(prev =>
      prev.map(e => (e.id === activeEmployeeId ? { ...e, name: employeeName } : e))
    )
  }, [employeeName, activeEmployeeId])

  // Scroll behavior: Independent scrolling with visual indicators
  const step1Ref = useRef(null)
  const step2Ref = useRef(null)
  const step3MandatoryRef = useRef(null)
  const step3Ref = useRef(null)
  const divisionOverheadTooltipTriggerRef = useRef(null)
  const [divisionOverheadTooltipOpen, setDivisionOverheadTooltipOpen] = useState(false)
  const [divisionOverheadTooltipPos, setDivisionOverheadTooltipPos] = useState({ top: 0, left: 0 })

  const updateDivisionOverheadTooltipPos = () => {
    const el = divisionOverheadTooltipTriggerRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      setDivisionOverheadTooltipPos({ top: rect.top, left: rect.left + rect.width / 2 })
    }
  }

  useEffect(() => {
    if (!divisionOverheadTooltipOpen) return
    const scrollEl = step3MandatoryRef.current
    const onScrollOrResize = () => updateDivisionOverheadTooltipPos()
    if (scrollEl) scrollEl.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      if (scrollEl) scrollEl.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [divisionOverheadTooltipOpen])

  // Auto-scroll inputs into view when focused
  useEffect(() => {
    const handleInputFocus = (e) => {
      if (e.target.tagName === 'INPUT') {
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
        }, 100)
      }
    }

    document.addEventListener('focusin', handleInputFocus)
    return () => {
      document.removeEventListener('focusin', handleInputFocus)
    }
  }, [])

  // Calculations
  const calculations = useMemo(() => {
    const eff = applyFieldLocksToMergedSnapshot(fieldLocks, {
      employeeName,
      hoursNotWorked,
      nonBillableHours,
      customHoursNotWorked,
      newCustomHoursNotWorked,
      customNonBillable,
      newCustomNonBillable,
      workersWage,
      mandatoryPayrollTaxPercents,
      mandatoryWorkerBurdenPercents,
      customPayrollTaxFields,
      customWorkerBurdenFields,
      newCustomPayrollTax,
      newCustomWorkerBurden,
      benefitsBurdenPercents,
      customBenefitsBurdenFields,
      newCustomBenefitsBurden,
      additionalOverheadsPercents,
      customAdditionalOverheadsFields,
      newCustomAdditionalOverheads,
      employeeCostsPercents,
      customEmployeeCosts,
      newCustomEmployeeCost,
      divisionOverheadPercent,
      generalCompanyOverheadPercent,
      profitPercent
    })

    // Step 1 calculations - Individual field percentages
    const hoursNotWorkedPercentages = Object.fromEntries(
      Object.entries(eff.hoursNotWorked).map(([id, hours]) => [
        id,
        PAID_CAPACITY > 0 ? ((parseFloat(hours) || 0) / PAID_CAPACITY) * 100 : 0
      ])
    )
    
    const nonBillableHoursPercentages = Object.fromEntries(
      Object.entries(eff.nonBillableHours).map(([id, hours]) => [
        id,
        PAID_CAPACITY > 0 ? ((parseFloat(hours) || 0) / PAID_CAPACITY) * 100 : 0
      ])
    )
    
    // Step 1 calculations - Totals
    const totalHoursNotWorked = Object.values(eff.hoursNotWorked).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const totalNonBillableHours = Object.values(eff.nonBillableHours).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const totalHoursAvailable = PAID_CAPACITY - totalHoursNotWorked - totalNonBillableHours
    const utilizationPercent = totalHoursAvailable / PAID_CAPACITY
    
    // Total percentages
    const totalHoursNotWorkedPercent = PAID_CAPACITY > 0 ? (totalHoursNotWorked / PAID_CAPACITY) * 100 : 0
    const totalNonBillableHoursPercent = PAID_CAPACITY > 0 ? (totalNonBillableHours / PAID_CAPACITY) * 100 : 0

    // Step 2 calculations - Workers Wage Charged is the key rate (Hourly Rate)
    const workersWageNum = parseFloat(eff.workersWage) || 0
    const workersWageCharged = utilizationPercent > 0 ? workersWageNum / utilizationPercent : 0

    // Mandatory Payroll Tax Burden calculations
    // Hrly = wage × (Brdn%/100); Spend/yr = Hrly × 2080; charged $/hr (Step 4) = workersWageCharged × (Brdn%/100)
    const payrollTaxHourlyRates = Object.fromEntries([
      ...MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageNum * ((parseFloat(eff.mandatoryPayrollTaxPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customPayrollTaxFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const payrollTaxCharged = Object.fromEntries([
      ...MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(eff.mandatoryPayrollTaxPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customPayrollTaxFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const combinedFederalPayrollTaxPercent = Object.values(eff.mandatoryPayrollTaxPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
                                             eff.customPayrollTaxFields.reduce((sum, field) => sum + (parseFloat(field.percent) || 0), 0)
    const combinedFederalPayrollTaxHourlyRate = Object.values(payrollTaxHourlyRates).reduce((sum, val) => sum + val, 0)
    const combinedFederalPayrollTaxCharged = Object.values(payrollTaxCharged).reduce((sum, val) => sum + val, 0)

    // Mandatory Worker Burden calculations
    const workerBurdenHourlyRates = Object.fromEntries([
      ...MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageNum * ((parseFloat(eff.mandatoryWorkerBurdenPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customWorkerBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const workerBurdenCharged = Object.fromEntries([
      ...MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(eff.mandatoryWorkerBurdenPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customWorkerBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const workerBurdenPercent = Object.values(eff.mandatoryWorkerBurdenPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
                                eff.customWorkerBurdenFields.reduce((sum, field) => sum + (parseFloat(field.percent) || 0), 0)
    const workerBurdenHourlyRate = Object.values(workerBurdenHourlyRates).reduce((sum, val) => sum + val, 0)
    const workerBurdenChargedTotal = Object.values(workerBurdenCharged).reduce((sum, val) => sum + val, 0)

    // Total Mandatory Burden
    const totalMandatoryBurdenPercent = combinedFederalPayrollTaxPercent + workerBurdenPercent
    const totalMandatoryBurdenHourlyRate = combinedFederalPayrollTaxHourlyRate + workerBurdenHourlyRate
    const totalMandatoryBurdenCharged = combinedFederalPayrollTaxCharged + workerBurdenChargedTotal

    // Benefits Burden calculations
    const benefitsBurdenHourlyRates = Object.fromEntries([
      ...BENEFITS_BURDEN_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageNum * ((parseFloat(eff.benefitsBurdenPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customBenefitsBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const benefitsBurdenCharged = Object.fromEntries([
      ...BENEFITS_BURDEN_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(eff.benefitsBurdenPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customBenefitsBurdenFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const benefitsBurdenPercent = Object.values(eff.benefitsBurdenPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
      eff.customBenefitsBurdenFields.reduce((sum, field) => sum + (parseFloat(field.percent) || 0), 0)
    const benefitsBurdenHourlyRate = Object.values(benefitsBurdenHourlyRates).reduce((sum, val) => sum + val, 0)
    const benefitsBurdenChargedTotal = Object.values(benefitsBurdenCharged).reduce((sum, val) => sum + val, 0)

    // Additional Overheads calculations
    const additionalOverheadsHourlyRates = Object.fromEntries([
      ...ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageNum * ((parseFloat(eff.additionalOverheadsPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customAdditionalOverheadsFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const additionalOverheadsCharged = Object.fromEntries([
      ...ADDITIONAL_OVERHEADS_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(eff.additionalOverheadsPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customAdditionalOverheadsFields.map((field, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(field.percent) || 0) / 100))
      ])
    ])
    
    const additionalOverheadsPercent = Object.values(eff.additionalOverheadsPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
      eff.customAdditionalOverheadsFields.reduce((sum, field) => sum + (parseFloat(field.percent) || 0), 0)
    const additionalOverheadsHourlyRate = Object.values(additionalOverheadsHourlyRates).reduce((sum, val) => sum + val, 0)
    const additionalOverheadsChargedTotal = Object.values(additionalOverheadsCharged).reduce((sum, val) => sum + val, 0)

    // Employee Costs calculations
    const employeeCostsHourlyRates = Object.fromEntries([
      ...EMPLOYEE_COSTS_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageNum * ((parseFloat(eff.employeeCostsPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customEmployeeCosts.map((cost, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageNum * ((parseFloat(cost.percent) || 0) / 100))
      ])
    ])
    
    const employeeCostsCharged = Object.fromEntries([
      ...EMPLOYEE_COSTS_OPTIONS.map(opt => [
        opt.id,
        roundBurdenDollar(workersWageCharged * ((parseFloat(eff.employeeCostsPercents[opt.id]) || 0) / 100))
      ]),
      ...eff.customEmployeeCosts.map((cost, idx) => [
        `custom-${idx}`,
        roundBurdenDollar(workersWageCharged * ((parseFloat(cost.percent) || 0) / 100))
      ])
    ])
    
    const employeeCostsPercent = Object.values(eff.employeeCostsPercents).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) +
                                 eff.customEmployeeCosts.reduce((sum, cost) => sum + (parseFloat(cost.percent) || 0), 0)
    const employeeCostsHourlyRate = Object.values(employeeCostsHourlyRates).reduce((sum, val) => sum + val, 0)
    const employeeCostsChargedTotal = Object.values(employeeCostsCharged).reduce((sum, val) => sum + val, 0)

    // Cost base before overhead & profit (total worker cost: wage charged + all burdens)
    const costBaseBeforeOverheadAndProfit =
      workersWageCharged +
      totalMandatoryBurdenCharged +
      benefitsBurdenChargedTotal +
      additionalOverheadsChargedTotal +
      employeeCostsChargedTotal

    // Margin formula: amount so that (base + amount) has margin% as the amount's share of the total.
    // (base + amount) * (1 - margin/100) = base  =>  amount = base * (margin/100) / (1 - margin/100)
    const marginAmount = (base, marginPercent) => {
      if (marginPercent <= 0) return 0
      const m = marginPercent / 100
      if (m >= 1) return 0 // avoid division by zero
      return base * m / (1 - m)
    }

    // Step 3: resolve Brdn % from locks (:brdn, or legacy key, or :hrly / :annual $ locks)
    let divPct = parseFloat(eff.divisionOverheadPercent) || 0
    {
      const dB = fieldLocks['divisionOverheadPercent:brdn'] ?? fieldLocks['divisionOverheadPercent']
      const dH = fieldLocks['divisionOverheadPercent:hrly']
      const dA = fieldLocks['divisionOverheadPercent:annual']
      const base = costBaseBeforeOverheadAndProfit
      const H = totalHoursAvailable
      if (dB?.locked && dB.value !== undefined) {
        const val = dB.value
        divPct = val === '' ? 0 : (parseFloat(val) || 0)
      } else if (dH?.locked && dH.value !== undefined) {
        const v = parseFloat(dH.value)
        if (!Number.isNaN(v) && v >= 0 && base + v > 0) divPct = 100 * v / (base + v)
      } else if (dA?.locked && dA.value !== undefined) {
        const v = parseFloat(dA.value)
        const hourly = H > 0 ? v / H : 0
        if (!Number.isNaN(v) && v >= 0 && H > 0 && base + hourly > 0) divPct = 100 * hourly / (base + hourly)
      }
    }

    // Division Overhead: H×R/(1−p) − H×R annually; hourly = annual / H (same as margin on R when H > 0)
    const divisionOverheadAnnualSpend = overheadAnnualFromFormula(
      totalHoursAvailable,
      costBaseBeforeOverheadAndProfit,
      divPct
    )
    const divisionOverheadCharged =
      totalHoursAvailable > 0
        ? roundBurdenDollar(divisionOverheadAnnualSpend / totalHoursAvailable)
        : 0
    const divisionOverheadHourlyRate = divisionOverheadCharged
    const totalAfterDivisionOverhead = costBaseBeforeOverheadAndProfit + divisionOverheadCharged

    let genPct = parseFloat(eff.generalCompanyOverheadPercent) || 0
    {
      const gB = fieldLocks['generalCompanyOverheadPercent:brdn'] ?? fieldLocks['generalCompanyOverheadPercent']
      const gH = fieldLocks['generalCompanyOverheadPercent:hrly']
      const gA = fieldLocks['generalCompanyOverheadPercent:annual']
      const base = totalAfterDivisionOverhead
      const H = totalHoursAvailable
      if (gB?.locked && gB.value !== undefined) {
        const val = gB.value
        genPct = val === '' ? 0 : (parseFloat(val) || 0)
      } else if (gH?.locked && gH.value !== undefined) {
        const v = parseFloat(gH.value)
        if (!Number.isNaN(v) && v >= 0 && base + v > 0) genPct = 100 * v / (base + v)
      } else if (gA?.locked && gA.value !== undefined) {
        const v = parseFloat(gA.value)
        const hourly = H > 0 ? v / H : 0
        if (!Number.isNaN(v) && v >= 0 && H > 0 && base + hourly > 0) genPct = 100 * hourly / (base + hourly)
      }
    }

    // General Company Overhead: same annual formula; R = total $/hr including division overhead
    const generalCompanyOverheadAnnualSpend = overheadAnnualFromFormula(
      totalHoursAvailable,
      totalAfterDivisionOverhead,
      genPct
    )
    const generalCompanyOverheadCharged =
      totalHoursAvailable > 0
        ? roundBurdenDollar(generalCompanyOverheadAnnualSpend / totalHoursAvailable)
        : 0
    const generalCompanyOverheadHourlyRate = generalCompanyOverheadCharged
    const totalAfterGeneralOverhead = totalAfterDivisionOverhead + generalCompanyOverheadCharged

    let profitPct = parseFloat(eff.profitPercent) || 0
    {
      const pB = fieldLocks['profitPercent:brdn'] ?? fieldLocks['profitPercent']
      const pH = fieldLocks['profitPercent:hrly']
      const pA = fieldLocks['profitPercent:annual']
      const base = totalAfterGeneralOverhead
      const H = totalHoursAvailable
      if (pB?.locked && pB.value !== undefined) {
        const val = pB.value
        profitPct = val === '' ? 0 : (parseFloat(val) || 0)
      } else if (pH?.locked && pH.value !== undefined) {
        const v = parseFloat(pH.value)
        if (!Number.isNaN(v) && v >= 0 && base + v > 0) profitPct = 100 * v / (base + v)
      } else if (pA?.locked && pA.value !== undefined) {
        const v = parseFloat(pA.value)
        const hourly = v / PAID_CAPACITY
        if (!Number.isNaN(v) && v >= 0 && base + hourly > 0) profitPct = 100 * hourly / (base + hourly)
      }
    }

    // Profit: margin on total of all costs including division and general overhead
    const profitCharged = marginAmount(totalAfterGeneralOverhead, profitPct)
    const profitHourlyRate = profitCharged

    // Total Labor Rate = full charge including all costs, overheads, and profit
    const totalLaborRateRaw = totalAfterGeneralOverhead + profitCharged
    const totalLaborRate = Number.isFinite(totalLaborRateRaw)
      ? Math.round(totalLaborRateRaw * 100) / 100
      : 0

    return {
      hoursNotWorkedPercentages,
      nonBillableHoursPercentages,
      totalHoursNotWorked,
      totalNonBillableHours,
      totalHoursAvailable,
      totalHoursNotWorkedPercent,
      totalNonBillableHoursPercent,
      utilizationPercent,
      workersWageCharged,
      payrollTaxHourlyRates,
      payrollTaxCharged,
      combinedFederalPayrollTaxPercent,
      combinedFederalPayrollTaxHourlyRate,
      combinedFederalPayrollTaxCharged,
      workerBurdenHourlyRates,
      workerBurdenCharged,
      workerBurdenPercent,
      workerBurdenHourlyRate,
      workerBurdenChargedTotal,
      totalMandatoryBurdenPercent,
      totalMandatoryBurdenHourlyRate,
      totalMandatoryBurdenCharged,
      benefitsBurdenHourlyRates,
      benefitsBurdenCharged,
      benefitsBurdenPercent,
      benefitsBurdenHourlyRate,
      benefitsBurdenChargedTotal,
      additionalOverheadsHourlyRates,
      additionalOverheadsCharged,
      additionalOverheadsPercent,
      additionalOverheadsHourlyRate,
      additionalOverheadsChargedTotal,
      employeeCostsHourlyRates,
      employeeCostsCharged,
      employeeCostsPercent,
      employeeCostsHourlyRate,
      employeeCostsChargedTotal,
      divisionOverheadHourlyRate,
      divisionOverheadCharged,
      divisionOverheadAnnualSpend,
      generalCompanyOverheadHourlyRate,
      generalCompanyOverheadCharged,
      generalCompanyOverheadAnnualSpend,
      profitHourlyRate,
      profitCharged,
      totalLaborRate,
      costBaseBeforeOverheadAndProfit,
      totalAfterDivisionOverhead,
      totalAfterGeneralOverhead
    }
  }, [
    hoursNotWorked,
    nonBillableHours,
    workersWage,
    mandatoryPayrollTaxPercents,
    mandatoryWorkerBurdenPercents,
    customPayrollTaxFields,
    customWorkerBurdenFields,
    benefitsBurdenPercents,
    customBenefitsBurdenFields,
    additionalOverheadsPercents,
    customAdditionalOverheadsFields,
    employeeCostsPercents,
    customEmployeeCosts,
    divisionOverheadPercent,
    generalCompanyOverheadPercent,
    profitPercent,
    fieldLocks
  ])

  const handleAddCustomHoursNotWorked = () => {
    if (newCustomHoursNotWorked.trim()) {
      setCustomHoursNotWorked(prev => [...prev, { id: `custom-${Date.now()}`, label: newCustomHoursNotWorked.trim() }])
      setNewCustomHoursNotWorked('')
    }
  }

  const handleAddCustomNonBillable = () => {
    if (newCustomNonBillable.trim()) {
      setCustomNonBillable(prev => [...prev, { id: `custom-${Date.now()}`, label: newCustomNonBillable.trim() }])
      setNewCustomNonBillable('')
    }
  }

  const handleAddCustomPayrollTax = () => {
    if (newCustomPayrollTax.name.trim()) {
      setCustomPayrollTaxFields(prev => {
        const percent = parseFloat(newCustomPayrollTax.percent) || 0
        const idx = prev.length
        setFieldLocks(cur => ({ ...cur, [`customPayrollTax:${idx}:brdn`]: { locked: true, value: percent } }))
        return [...prev, {
          id: `custom-${Date.now()}`,
          label: newCustomPayrollTax.name.trim(),
          percent
        }]
      })
      setNewCustomPayrollTax({ name: '', percent: 0 })
    }
  }

  const handleAddCustomWorkerBurden = () => {
    if (newCustomWorkerBurden.name.trim()) {
      setCustomWorkerBurdenFields(prev => {
        const percent = parseFloat(newCustomWorkerBurden.percent) || 0
        const idx = prev.length
        setFieldLocks(cur => ({ ...cur, [`customWorkerBurden:${idx}:brdn`]: { locked: true, value: percent } }))
        return [...prev, {
          id: `custom-${Date.now()}`,
          label: newCustomWorkerBurden.name.trim(),
          percent
        }]
      })
      setNewCustomWorkerBurden({ name: '', percent: 0 })
    }
  }

  const handleAddCustomBenefitsBurden = () => {
    if (newCustomBenefitsBurden.name.trim()) {
      setCustomBenefitsBurdenFields(prev => {
        const percent = parseFloat(newCustomBenefitsBurden.percent) || 0
        const idx = prev.length
        setFieldLocks(cur => ({ ...cur, [`customBenefits:${idx}:brdn`]: { locked: true, value: percent } }))
        return [...prev, {
          id: `custom-${Date.now()}`,
          label: newCustomBenefitsBurden.name.trim(),
          percent
        }]
      })
      setNewCustomBenefitsBurden({ name: '', percent: 0 })
    }
  }

  const handleAddCustomAdditionalOverheads = () => {
    if (newCustomAdditionalOverheads.name.trim()) {
      setCustomAdditionalOverheadsFields(prev => {
        const percent = parseFloat(newCustomAdditionalOverheads.percent) || 0
        const idx = prev.length
        setFieldLocks(cur => ({ ...cur, [`customAdditionalOverheads:${idx}:annual`]: { locked: true, value: 0 } }))
        return [...prev, {
          id: `custom-${Date.now()}`,
          label: newCustomAdditionalOverheads.name.trim(),
          percent
        }]
      })
      setNewCustomAdditionalOverheads({ name: '', percent: 0 })
    }
  }

  const handleAddCustomEmployeeCost = () => {
    if (newCustomEmployeeCost.name.trim()) {
      setCustomEmployeeCosts(prev => {
        const percent = parseFloat(newCustomEmployeeCost.percent) || 0
        const idx = prev.length
        setFieldLocks(cur => ({ ...cur, [`customEmployeeCosts:${idx}:annual`]: { locked: true, value: 0 } }))
        return [...prev, {
          id: `custom-${Date.now()}`,
          label: newCustomEmployeeCost.name.trim(),
          percent
        }]
      })
      setNewCustomEmployeeCost({ name: '', percent: 0 })
    }
  }

  const allHoursNotWorkedOptions = [...HOURS_NOT_WORKED_OPTIONS, ...customHoursNotWorked]
  const allNonBillableOptions = [...NON_BILLABLE_HOURS_OPTIONS, ...customNonBillable]

  const hasAnyNamedEmployee = useMemo(
    () => employeeRoster.some(e => (e.name || '').trim() !== ''),
    [employeeRoster]
  )

  // Ensure calculations object is always defined
  const safeCalculations = calculations || {
    hoursNotWorkedPercentages: {},
    nonBillableHoursPercentages: {},
    totalHoursNotWorked: 0,
    totalNonBillableHours: 0,
    totalHoursAvailable: PAID_CAPACITY,
    totalHoursNotWorkedPercent: 0,
    totalNonBillableHoursPercent: 0,
    utilizationPercent: 1,
    workersWageCharged: parseFloat(workersWage) || 0,
    payrollTaxHourlyRates: {},
    payrollTaxCharged: {},
    combinedFederalPayrollTaxPercent: 0,
    combinedFederalPayrollTaxHourlyRate: 0,
    combinedFederalPayrollTaxCharged: 0,
    workerBurdenHourlyRates: {},
    workerBurdenCharged: {},
    workerBurdenPercent: 0,
    workerBurdenHourlyRate: 0,
    workerBurdenChargedTotal: 0,
    totalMandatoryBurdenPercent: 0,
    totalMandatoryBurdenHourlyRate: 0,
      totalMandatoryBurdenCharged: 0,
      benefitsBurdenHourlyRates: {},
      benefitsBurdenCharged: {},
      benefitsBurdenPercent: 0,
      benefitsBurdenHourlyRate: 0,
      benefitsBurdenChargedTotal: 0,
      additionalOverheadsHourlyRates: {},
      additionalOverheadsCharged: {},
      additionalOverheadsPercent: 0,
      additionalOverheadsHourlyRate: 0,
      additionalOverheadsChargedTotal: 0,
      employeeCostsHourlyRates: {},
      employeeCostsCharged: {},
      employeeCostsPercent: 0,
      employeeCostsHourlyRate: 0,
      employeeCostsChargedTotal: 0,
      divisionOverheadHourlyRate: 0,
      divisionOverheadCharged: 0,
      divisionOverheadAnnualSpend: 0,
      generalCompanyOverheadHourlyRate: 0,
      generalCompanyOverheadCharged: 0,
      generalCompanyOverheadAnnualSpend: 0,
      profitHourlyRate: 0,
      profitCharged: 0,
      totalLaborRate: parseFloat(workersWage) || 0,
      costBaseBeforeOverheadAndProfit: 0,
      totalAfterDivisionOverhead: 0,
      totalAfterGeneralOverhead: 0
  }

  return (
    <div className="min-h-screen w-full min-w-0 bg-light py-4 sm:py-6 lg:py-8 overflow-x-hidden print:bg-white print:min-h-0 print:py-4">
      <div className="container mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 max-w-7xl print:max-w-none">
        <div className="flex flex-col items-center mb-6 lg:mb-8 print:hidden">
          <img
            src="/logo.png"
            alt="Labor Rate Calculator"
            className="h-12 sm:h-14 lg:h-16 w-auto object-contain"
          />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mt-3 text-center">
            Building Your Labor Rate Calculator
          </h1>
          {(employeeName || '').trim() ? (
            <p className="text-lg sm:text-xl font-semibold text-neutral mt-2 text-center">
              {(employeeName || '').trim()}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3 print:flex-col print:gap-3 lg:flex-row lg:gap-3">
          {/* Step 1: Paid Capacity */}
          <div className="min-w-0 w-full flex-1 basis-0 print:hidden">
            <div 
              ref={step1Ref}
              className="w-full min-w-0 overflow-x-hidden overflow-y-auto scroll-smooth rounded-lg bg-white px-5 pb-6 pt-6 shadow-lg sticky top-4 max-h-[calc(100vh-2rem)]"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-xl font-bold text-primary mb-3 border-b-2 border-primary pb-2">
                Step 1: Paid Capacity
              </h2>

              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="employee-name" className="block text-sm font-semibold text-neutral">
                    Employee name
                  </label>
                  <input
                    id="employee-name"
                    type="text"
                    autoComplete="name"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
                  <label htmlFor="employee-switcher" className="text-xs font-medium text-gray-600 shrink-0">
                    Working on
                  </label>
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <select
                      id="employee-switcher"
                      value={activeEmployeeId}
                      onChange={(e) => switchToEmployee(e.target.value)}
                      className="min-w-0 flex-1 sm:flex-initial max-w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                    >
                      {employeeRoster.map((e, idx) => (
                        <option key={e.id} value={e.id}>
                          {workingOnOptionLabel(e.name, idx + 1, hasAnyNamedEmployee)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addEmployee}
                      className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-green-700 transition-colors shrink-0"
                    >
                      Add employee
                    </button>
                    {employeeRoster.length > 1 ? (
                      <button
                        type="button"
                        onClick={removeActiveEmployee}
                        className="px-3 py-1.5 text-sm font-medium border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-snug">
                  Each employee has their own inputs and results. Switch employees here or add another to run the calculator for someone else.
                </p>
              </div>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Paid Capacity:</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{PAID_CAPACITY.toLocaleString()} hours</div>
                    <div className="text-xs text-gray-500 mt-1">
                      = 52 weeks × 40 hours/week
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours Not Worked */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-neutral mb-3">
                  Hours Not Worked
                </h3>
                
                {/* Table Header — label column flexible, hours & % compact; headers centered over hrs and % */}
                <div className="grid gap-1 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-2 min-w-0 grid-cols-[1fr_minmax(6.5rem,auto)_4rem]">
                  <div className="min-w-0 px-1"></div>
                  <div className="flex items-center justify-center leading-tight px-1 min-w-0 w-full -translate-x-[11px]">
                    <div className="whitespace-nowrap">Hours Allocated</div>
                  </div>
                  <div className="flex items-center justify-center leading-tight px-1 min-w-0 w-full -translate-x-[6px]">
                    <div className="whitespace-nowrap">Brdn Chg (%)</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {allHoursNotWorkedOptions.map(option => {
                    const hours = parseFloat(hoursNotWorked[option.id]) || 0
                    const percent = safeCalculations.hoursNotWorkedPercentages[option.id] || 0
                    const isCustomHoursNotWorked = customHoursNotWorked.some(c => c.id === option.id)
                    return (
                      <div key={option.id} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0 px-1 mb-1">
                          <label className="text-gray-700 text-xs font-medium break-words line-clamp-2 leading-tight min-w-0">
                            {option.label}
                          </label>
                          {isCustomHoursNotWorked && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomHoursNotWorked(prev => prev.filter(c => c.id !== option.id))
                                setHoursNotWorked(prev => {
                                  const next = { ...prev }
                                  delete next[option.id]
                                  return next
                                })
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <div className="grid gap-1 items-center min-w-0 grid-cols-[1fr_minmax(6.5rem,auto)_4rem]">
                          <div className="min-w-0 px-1"></div>
                          <div className="flex flex-col items-center justify-center gap-0.5 w-full min-w-0 px-0.5">
                            <div className="flex items-center justify-center gap-0.5 flex-wrap">
                            <input
                              type="number"
                              step="1"
                              value={hoursNotWorked[option.id] || ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setHoursNotWorked(prev => ({ ...prev, [option.id]: v }))
                              }}
                              className="w-11 px-1.5 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                              placeholder="0"
                            />
                            <span className="text-gray-500 text-xs shrink-0">hrs</span>
                            </div>
                          </div>
                          <div className="w-full text-center text-xs font-semibold text-primary px-1 min-w-0">
                            {percent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Hours Not Worked */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomHoursNotWorked}
                      onChange={(e) => setNewCustomHoursNotWorked(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomHoursNotWorked()}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomHoursNotWorked}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                {/* Total PTO, Holidays and Sick Time */}
                <div className="mt-3 grid gap-1 items-center p-2 border-2 border-primary rounded-lg bg-primary/5 min-w-0 grid-cols-[1fr_minmax(6.5rem,auto)_4rem]">
                  <div className="text-gray-700 text-xs font-semibold break-words leading-tight min-w-0 px-1">Total PTO, Holidays and Sick Time</div>
                  <div className="w-full text-center text-xs font-semibold text-gray-700 px-1 min-w-0 translate-x-[8px]">
                    {safeCalculations.totalHoursNotWorked} hrs
                  </div>
                  <div className="w-full text-center text-xs font-bold text-primary px-1 min-w-0 translate-x-[8px]">
                    {safeCalculations.totalHoursNotWorkedPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Non-Billable Hours */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-neutral mb-3">
                  Non-Billable Hours
                </h3>
                
                {/* Table Header — label column flexible, hours & % compact; headers centered over hrs and % */}
                <div className="grid gap-1 mb-2 text-xs font-semibold text-gray-600 border-b border-gray-300 pb-2 min-w-0 grid-cols-[1fr_minmax(6.5rem,auto)_4rem]">
                  <div className="min-w-0 px-1"></div>
                  <div className="flex items-center justify-center leading-tight px-1 min-w-0 w-full -translate-x-[11px]">
                    <div className="whitespace-nowrap">Hours Allocated</div>
                  </div>
                  <div className="flex items-center justify-center leading-tight px-1 min-w-0 w-full -translate-x-[6px]">
                    <div className="whitespace-nowrap">Brdn Chg (%)</div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {allNonBillableOptions.map(option => {
                    const hours = parseFloat(nonBillableHours[option.id]) || 0
                    const percent = safeCalculations.nonBillableHoursPercentages[option.id] || 0
                    const isCustomNonBillable = customNonBillable.some(c => c.id === option.id)
                    return (
                      <div key={option.id} className={`p-2 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 ${option.tooltip ? 'overflow-visible' : ''}`}>
                        <div className={`flex items-start justify-between gap-2 min-w-0 px-1 mb-1 ${option.tooltip ? 'overflow-visible' : 'overflow-hidden'}`}>
                          <div className={`flex items-start gap-1.5 min-w-0 ${option.tooltip ? 'overflow-visible' : 'overflow-hidden'}`}>
                            <label className="text-gray-700 text-xs font-medium whitespace-pre-line break-words line-clamp-2 leading-tight min-w-0 overflow-hidden">
                              {option.label}
                            </label>
                            {option.tooltip && (
                              <div className="relative group flex-shrink-0">
                                <svg
                                  className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-normal opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                  {option.tooltip}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          {isCustomNonBillable && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomNonBillable(prev => prev.filter(c => c.id !== option.id))
                                setNonBillableHours(prev => {
                                  const next = { ...prev }
                                  delete next[option.id]
                                  return next
                                })
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <div className="grid gap-1 items-center min-w-0 grid-cols-[1fr_minmax(6.5rem,auto)_4rem]">
                          <div className="min-w-0 px-1"></div>
                          <div className="flex flex-col items-center justify-center gap-0.5 w-full min-w-0 px-0.5">
                            <div className="flex items-center justify-center gap-0.5 flex-wrap">
                            <input
                              type="number"
                              step="1"
                              value={nonBillableHours[option.id] || ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setNonBillableHours(prev => ({ ...prev, [option.id]: v }))
                              }}
                              className="w-11 px-1.5 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                              placeholder="0"
                            />
                            <span className="text-gray-500 text-xs shrink-0">hrs</span>
                            </div>
                          </div>
                          <div className="w-full text-center text-xs font-semibold text-primary px-1 min-w-0">
                              {percent.toFixed(2)}%
                            </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>

                  {/* Add Custom Non-Billable */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomNonBillable}
                      onChange={(e) => setNewCustomNonBillable(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomNonBillable()}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomNonBillable}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                {/* Total Non-Billable Hours */}
                <div className="mt-3 flex flex-col gap-1 p-2 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold leading-tight min-w-0 px-1 whitespace-nowrap">Total Non-Billable Hours</div>
                  <div className="grid gap-1 items-center min-w-0 grid-cols-[1fr_minmax(6.5rem,auto)_4rem]">
                    <div className="min-w-0 px-1"></div>
                    <div className="w-full text-center text-xs font-semibold text-gray-700 px-1 min-w-0 translate-x-[8px]">
                      {safeCalculations.totalNonBillableHours} hrs
                    </div>
                    <div className="w-full text-center text-xs font-bold text-primary px-1 min-w-0 translate-x-[8px]">
                      {safeCalculations.totalNonBillableHoursPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Hours Available For Work */}
              <div className="mt-3 flex flex-col gap-1 p-2 border-2 border-primary rounded-lg bg-primary/10 min-w-0">
                <div className="text-gray-700 text-xs font-bold leading-tight min-w-0 px-1 whitespace-nowrap">Total Hours Available For Work</div>
                <div className="grid gap-1 items-center min-w-0 grid-cols-[1fr_minmax(6.5rem,auto)_4rem]">
                  <div className="min-w-0 px-1"></div>
                  <div className="w-full text-center text-xs font-bold text-gray-700 px-1 min-w-0 translate-x-[8px]">
                    {safeCalculations.totalHoursAvailable.toFixed(2)} hrs
                  </div>
                  <div className="w-full text-center text-xs font-bold text-primary px-1 min-w-0 translate-x-[8px]">
                    {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Wage Burden */}
          <div className="min-w-0 w-full flex-1 basis-0 print:hidden">
            <div 
              ref={step2Ref}
              className="relative z-10 w-full min-w-0 overflow-x-auto overflow-y-auto scroll-smooth rounded-lg bg-white px-5 pb-6 pt-6 shadow-lg sticky top-4 max-h-[calc(100vh-2rem)]"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-xl font-bold text-primary mb-3 border-b-2 border-primary pb-2">
                Step 2: Wage Burden
              </h2>
              <p className="text-xs text-gray-600 mb-4 leading-snug">
                Use the <span className="font-semibold text-primary">lock</span> under Brdn (%), Hrly ($), or Spend/yr ($) to keep that value when you switch employees. Unlock to use different values per person.
              </p>

              {/* Workers Wage Box */}
              <div className="mb-6 p-3 sm:p-4 border-2 border-primary rounded-lg min-w-0 overflow-hidden">
                <h3 className="text-[1.6rem] font-semibold text-primary mb-3 leading-tight">
                  Workers Wage
                </h3>
                <div className="space-y-3 min-w-0 text-sm sm:text-base">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 min-w-0">
                    <label className="text-gray-700 font-medium min-w-0">
                      Workers Wage:
                    </label>
                    <div className="flex min-w-0 items-center justify-end gap-1.5 whitespace-nowrap">
                      <span className="text-gray-500 shrink-0">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={workersWage}
                        onChange={(e) => setWorkersWage(e.target.value)}
                        className="w-20 sm:w-24 px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right font-semibold no-spinner"
                      />
                      <span className="text-gray-500 shrink-0">/hr</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 pt-2 border-t border-primary/20 min-w-0">
                    <label className="text-gray-700 font-medium min-w-0">
                      Burden/hour to charge:
                    </label>
                    <div className="text-right min-w-0">
                      <div className="text-xl font-bold text-primary leading-tight whitespace-nowrap">
                        ${safeCalculations.workersWageCharged.toFixed(2)}/hr
                      </div>
                      <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                        = ${(parseFloat(workersWage) || 0).toFixed(2)} ÷ {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mandatory Payroll Tax Burden */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Mandatory Payroll Tax Burden
                </h3>
                
                {/* Table Header — fixed-width grid flush right matches every row below */}
                <div className="mb-2 min-w-0 -ml-[10px] flex justify-end border-b border-gray-300 pb-1 pr-1.5 pl-1.5">
                  <div className={STEP2_BURDEN_WRAP}>
                    <div className={`${STEP2_BURDEN_GRID} font-semibold text-gray-600 text-xs`}>
                      <div className="text-right whitespace-nowrap px-0.5">Brdn (%)</div>
                      <div className="text-right whitespace-nowrap px-0.5">Hrly ($)</div>
                      <div className="text-right whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {MANDATORY_PAYROLL_TAX_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.payrollTaxHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="min-w-0 pl-[10px] pr-1 overflow-x-auto">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium min-w-0 whitespace-nowrap text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP2_BURDEN_WRAP}>
                            <div className={`${STEP2_BURDEN_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 px-0.5 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `payrollTax:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(mandatoryPayrollTaxPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `payrollTax:${option.id}`,
                              value: formatBrdnPercentForDisplay(mandatoryPayrollTaxPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `payrollTax:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `payrollTax:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = mandatoryPayrollTaxPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `payrollTax:${option.id}:brdn`
                              if (draft === '' || Number.isNaN(v)) {
                                setMandatoryPayrollTaxPercents(prev => ({ ...prev, [option.id]: '' }))
                                if (fieldLocks[brdnPath]?.locked) updateFieldLockValue(brdnPath, '')
                              } else {
                                const nv = Math.round(v * 100) / 100
                                setMandatoryPayrollTaxPercents(prev => ({ ...prev, [option.id]: nv }))
                                if (fieldLocks[brdnPath]?.locked) updateFieldLockValue(brdnPath, nv)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`payrollTax:${option.id}:brdn`] ?? fieldLocks[`payrollTax:${option.id}`])?.locked}
                            onToggle={() => toggleFieldLock(`payrollTax:${option.id}:brdn`, () => mandatoryPayrollTaxPercents[option.id])}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 px-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'payrollTax', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => {
                              if (editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                setEditingDollarField(prev => ({ ...prev, value: e.target.value }))
                              }
                            }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `payrollTax:${option.id}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setMandatoryPayrollTaxPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`payrollTax:${option.id}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`payrollTax:${option.id}:hrly`, () => (safeCalculations.payrollTaxHourlyRates[option.id] || 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 pl-0.5 pr-2 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`payrollTax:${option.id}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'payrollTax', rowId: option.id, field: 'chgd', value: getAnnualInputDisplay(`payrollTax:${option.id}:annual`, annualSpend) })}
                            onChange={(e) => {
                              if (editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                setEditingDollarField(prev => ({ ...prev, value: e.target.value }))
                              }
                            }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'payrollTax' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `payrollTax:${option.id}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setMandatoryPayrollTaxPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`payrollTax:${option.id}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`payrollTax:${option.id}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.payrollTaxHourlyRates[option.id] || 0))}
                          />
                        </div>
                        </div>
                        </div>
                        </div>
                      </div>
                    )
                  })}
                  {customPayrollTaxFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.payrollTaxHourlyRates[`custom-${idx}`] ?? 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={field.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="flex items-start justify-between gap-2 min-w-0 pl-[10px] pr-1">
                          <div className="min-w-0 flex-1 overflow-x-auto">
                            <TruncatedLabelWithTooltip
                              label={field.label.replace(/\n/g, ' ')}
                              fullText={field.label.replace(/\n/g, ' ')}
                              labelClassName="text-gray-700 font-medium min-w-0 whitespace-nowrap text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomPayrollTaxFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP2_BURDEN_WRAP}>
                            <div className={`${STEP2_BURDEN_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 px-0.5 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `payrollTaxCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(field.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `payrollTaxCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(field.percent)
                            })}
                            onChange={(e) => {
                              const k = `payrollTaxCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `payrollTaxCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = field.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `customPayrollTax:${idx}:brdn`
                              setCustomPayrollTaxFields(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              if (fieldLocks[brdnPath]?.locked || fieldLocks[`customPayrollTax:${idx}`]?.locked) {
                                if (draft === '' || Number.isNaN(v)) updateFieldLockValue(brdnPath, '')
                                else updateFieldLockValue(brdnPath, Math.round(v * 100) / 100)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`customPayrollTax:${idx}:brdn`] ?? fieldLocks[`customPayrollTax:${idx}`])?.locked}
                            onToggle={() => toggleFieldLock(`customPayrollTax:${idx}:brdn`, () => customPayrollTaxFields[idx]?.percent)}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 px-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? Number(hourlyRate).toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'payrollTaxCustom', rowId: `custom-${idx}`, customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? Number(hourlyRate).toFixed(2) : '' })}
                            onChange={(e) => {
                              if (editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                setEditingDollarField(prev => ({ ...prev, value: e.target.value }))
                              }
                            }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `customPayrollTax:${idx}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setCustomPayrollTaxFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customPayrollTax:${idx}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`customPayrollTax:${idx}:hrly`, () => (safeCalculations.payrollTaxHourlyRates[`custom-${idx}`] ?? 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 pl-0.5 pr-2 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`customPayrollTax:${idx}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'payrollTaxCustom', rowId: `custom-${idx}`, customIdx: idx, field: 'chgd', value: getAnnualInputDisplay(`customPayrollTax:${idx}:annual`, annualSpend) })}
                            onChange={(e) => {
                              if (editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                setEditingDollarField(prev => ({ ...prev, value: e.target.value }))
                              }
                            }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'payrollTaxCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `customPayrollTax:${idx}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setCustomPayrollTaxFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customPayrollTax:${idx}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`customPayrollTax:${idx}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.payrollTaxHourlyRates[`custom-${idx}`] ?? 0))}
                          />
                        </div>
                        </div>
                        </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Payroll Tax Field */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomPayrollTax.name}
                      onChange={(e) => setNewCustomPayrollTax(prev => ({ ...prev, name: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomPayrollTax()}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomPayrollTax}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Payroll Tax Burden */}
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0 -ml-[10px]">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 pr-1 overflow-hidden ml-[10px] break-words" title="Payroll Tax Burden">Payroll Tax Burden</div>
                  <div className="flex w-full justify-end -translate-x-[5px]">
                    <div className={STEP2_BURDEN_WRAP}>
                      <div className={`${STEP2_BURDEN_GRID} items-center`}>
                        <div className="text-right text-xs font-semibold text-primary px-0.5">
                          {safeCalculations.combinedFederalPayrollTaxPercent.toFixed(2)}%
                        </div>
                        <div className="text-right text-xs font-bold text-gray-700 px-0.5">
                          ${safeCalculations.combinedFederalPayrollTaxHourlyRate.toFixed(2)}
                        </div>
                        <div className="text-right text-xs font-bold text-primary pl-0.5 pr-2">
                          ${annualSpendFromEarnedHourly(safeCalculations.combinedFederalPayrollTaxHourlyRate).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mandatory Worker Burden */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral mb-3">
                  Mandatory Worker Burden
                </h3>
                
                {/* Table Header */}
                <div className="mb-2 min-w-0 -ml-[10px] flex justify-end border-b border-gray-300 pb-1 pr-1.5 pl-1.5">
                  <div className={STEP2_BURDEN_WRAP}>
                    <div className={`${STEP2_BURDEN_GRID} font-semibold text-gray-600 text-xs`}>
                      <div className="text-right whitespace-nowrap px-0.5">Brdn (%)</div>
                      <div className="text-right whitespace-nowrap px-0.5">Hrly ($)</div>
                      <div className="text-right whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {MANDATORY_WORKER_BURDEN_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.workerBurdenHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="min-w-0 pl-[10px] pr-1 overflow-x-auto">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium min-w-0 whitespace-nowrap text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP2_BURDEN_WRAP}>
                            <div className={`${STEP2_BURDEN_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 px-0.5 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `workerBurden:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(mandatoryWorkerBurdenPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `workerBurden:${option.id}`,
                              value: formatBrdnPercentForDisplay(mandatoryWorkerBurdenPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `workerBurden:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `workerBurden:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = mandatoryWorkerBurdenPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `workerBurden:${option.id}:brdn`
                              if (draft === '' || Number.isNaN(v)) {
                                setMandatoryWorkerBurdenPercents(prev => ({ ...prev, [option.id]: '' }))
                                if (fieldLocks[brdnPath]?.locked) updateFieldLockValue(brdnPath, '')
                              } else {
                                const nv = Math.round(v * 100) / 100
                                setMandatoryWorkerBurdenPercents(prev => ({ ...prev, [option.id]: nv }))
                                if (fieldLocks[brdnPath]?.locked) updateFieldLockValue(brdnPath, nv)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`workerBurden:${option.id}:brdn`] ?? fieldLocks[`workerBurden:${option.id}`])?.locked}
                            onToggle={() => toggleFieldLock(`workerBurden:${option.id}:brdn`, () => mandatoryWorkerBurdenPercents[option.id])}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 px-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'workerBurden', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `workerBurden:${option.id}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setMandatoryWorkerBurdenPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`workerBurden:${option.id}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`workerBurden:${option.id}:hrly`, () => (safeCalculations.workerBurdenHourlyRates[option.id] || 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 pl-0.5 pr-2 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`workerBurden:${option.id}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'workerBurden', rowId: option.id, field: 'chgd', value: getAnnualInputDisplay(`workerBurden:${option.id}:annual`, annualSpend) })}
                            onChange={(e) => { if (editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'workerBurden' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `workerBurden:${option.id}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setMandatoryWorkerBurdenPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`workerBurden:${option.id}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`workerBurden:${option.id}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.workerBurdenHourlyRates[option.id] || 0))}
                          />
                        </div>
                        </div>
                        </div>
                        </div>
                      </div>
                    )
                  })}
                  {customWorkerBurdenFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.workerBurdenHourlyRates[`custom-${idx}`] ?? 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={field.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0 -ml-[10px]">
                        <div className="flex items-start justify-between gap-2 min-w-0 pl-[10px] pr-1">
                          <div className="min-w-0 flex-1 overflow-x-auto">
                            <TruncatedLabelWithTooltip
                              label={field.label.replace(/\n/g, ' ')}
                              fullText={field.label.replace(/\n/g, ' ')}
                              labelClassName="text-gray-700 font-medium min-w-0 whitespace-nowrap text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomWorkerBurdenFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP2_BURDEN_WRAP}>
                            <div className={`${STEP2_BURDEN_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 px-0.5 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `workerBurdenCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(field.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `workerBurdenCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(field.percent)
                            })}
                            onChange={(e) => {
                              const k = `workerBurdenCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `workerBurdenCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = field.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `customWorkerBurden:${idx}:brdn`
                              setCustomWorkerBurdenFields(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              if (fieldLocks[brdnPath]?.locked || fieldLocks[`customWorkerBurden:${idx}`]?.locked) {
                                if (draft === '' || Number.isNaN(v)) updateFieldLockValue(brdnPath, '')
                                else updateFieldLockValue(brdnPath, Math.round(v * 100) / 100)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`customWorkerBurden:${idx}:brdn`] ?? fieldLocks[`customWorkerBurden:${idx}`])?.locked}
                            onToggle={() => toggleFieldLock(`customWorkerBurden:${idx}:brdn`, () => customWorkerBurdenFields[idx]?.percent)}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 px-0.5 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? Number(hourlyRate).toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'workerBurdenCustom', customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? Number(hourlyRate).toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `customWorkerBurden:${idx}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setCustomWorkerBurdenFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customWorkerBurden:${idx}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`customWorkerBurden:${idx}:hrly`, () => (safeCalculations.workerBurdenHourlyRates[`custom-${idx}`] ?? 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 pl-0.5 pr-2 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`customWorkerBurden:${idx}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'workerBurdenCustom', customIdx: idx, field: 'chgd', value: getAnnualInputDisplay(`customWorkerBurden:${idx}:annual`, annualSpend) })}
                            onChange={(e) => { if (editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'workerBurdenCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `customWorkerBurden:${idx}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setCustomWorkerBurdenFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customWorkerBurden:${idx}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`customWorkerBurden:${idx}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.workerBurdenHourlyRates[`custom-${idx}`] ?? 0))}
                          />
                        </div>
                        </div>
                        </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Worker Burden Field */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomWorkerBurden.name}
                      onChange={(e) => setNewCustomWorkerBurden(prev => ({ ...prev, name: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomWorkerBurden()}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomWorkerBurden}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Worker Burden Total */}
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0 -ml-[10px]">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 pr-1 overflow-hidden ml-[10px] break-words" title="Worker Burden">Worker Burden</div>
                  <div className="flex w-full justify-end -translate-x-[5px]">
                    <div className={STEP2_BURDEN_WRAP}>
                      <div className={`${STEP2_BURDEN_GRID} items-center`}>
                        <div className="text-right text-xs font-semibold text-primary px-0.5">
                          {safeCalculations.workerBurdenPercent.toFixed(2)}%
                        </div>
                        <div className="text-right text-xs font-bold text-gray-700 px-0.5">
                          ${safeCalculations.workerBurdenHourlyRate.toFixed(2)}
                        </div>
                        <div className="text-right text-xs font-bold text-primary pl-0.5 pr-2">
                          ${annualSpendFromEarnedHourly(safeCalculations.workerBurdenHourlyRate).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Wage Burden */}
              <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/10 min-w-0 -ml-[10px]">
                <div className="text-gray-700 text-xs font-bold min-w-0 pr-1 overflow-hidden ml-[10px] break-words" title="Total Wage Burden">Total Wage Burden</div>
                <div className="flex w-full justify-end -translate-x-[5px]">
                  <div className={STEP2_BURDEN_WRAP}>
                    <div className={`${STEP2_BURDEN_GRID} items-center`}>
                      <div className="text-right text-xs font-bold text-primary px-0.5">
                        {safeCalculations.totalMandatoryBurdenPercent.toFixed(2)}%
                      </div>
                      <div className="text-right text-xs font-bold text-gray-700 px-0.5">
                        ${safeCalculations.totalMandatoryBurdenHourlyRate.toFixed(2)}
                      </div>
                      <div className="text-right text-xs font-bold text-primary pl-0.5 pr-2">
                        ${annualSpendFromEarnedHourly(safeCalculations.totalMandatoryBurdenHourlyRate).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Mandatory Burden */}
          <div className="min-w-0 w-full flex-1 basis-0 print:hidden">
            <div 
              ref={step3MandatoryRef}
              className="relative z-10 w-full min-w-0 overflow-x-auto overflow-y-auto scroll-smooth rounded-lg bg-white px-5 pb-6 pt-6 shadow-lg sticky top-4 max-h-[calc(100vh-2rem)]"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-xl font-bold text-primary mb-3 border-b-2 border-primary pb-2">
                Step 3: Mandatory Burden
              </h2>

              {/* Benefits Burden */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Benefits Burden
                </h3>
                
                {/* Table Header */}
                <div className="mb-2 min-w-0 flex justify-end border-b border-gray-300 pb-1 pr-1.5 pl-1.5">
                  <div className={STEP3_BURDEN3_WRAP}>
                    <div className={`${STEP3_BURDEN3_GRID} text-xs font-semibold text-gray-600`}>
                        <div className="text-right whitespace-nowrap px-0.5">Brdn (%)</div>
                        <div className="text-right whitespace-nowrap px-0.5">Hrly ($)</div>
                        <div className="text-right whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                      </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {BENEFITS_BURDEN_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.benefitsBurdenHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <div className="min-w-0 pr-1">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP3_BURDEN3_WRAP}>
                            <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `benefits:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(benefitsBurdenPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `benefits:${option.id}`,
                              value: formatBrdnPercentForDisplay(benefitsBurdenPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `benefits:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `benefits:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = benefitsBurdenPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `benefits:${option.id}:brdn`
                              if (draft === '' || Number.isNaN(v)) {
                                setBenefitsBurdenPercents(prev => ({ ...prev, [option.id]: '' }))
                                if (fieldLocks[brdnPath]?.locked || fieldLocks[`benefits:${option.id}`]?.locked) updateFieldLockValue(brdnPath, '')
                              } else {
                                const nv = Math.round(v * 100) / 100
                                setBenefitsBurdenPercents(prev => ({ ...prev, [option.id]: nv }))
                                if (fieldLocks[brdnPath]?.locked || fieldLocks[`benefits:${option.id}`]?.locked) updateFieldLockValue(brdnPath, nv)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`benefits:${option.id}:brdn`]?.locked || fieldLocks[`benefits:${option.id}`]?.locked)}
                            onToggle={() => toggleFieldLock(`benefits:${option.id}:brdn`, () => benefitsBurdenPercents[option.id])}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'benefits', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `benefits:${option.id}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setBenefitsBurdenPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`benefits:${option.id}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`benefits:${option.id}:hrly`, () => (safeCalculations.benefitsBurdenHourlyRates[option.id] || 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible pl-0.5 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`benefits:${option.id}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'benefits', rowId: option.id, field: 'chgd', value: getAnnualInputDisplay(`benefits:${option.id}:annual`, annualSpend) })}
                            onChange={(e) => { if (editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'benefits' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `benefits:${option.id}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setBenefitsBurdenPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`benefits:${option.id}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`benefits:${option.id}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.benefitsBurdenHourlyRates[option.id] || 0))}
                          />
                        </div>
                        </div>
                      </div>
                      </div>
                      </div>
                    )
                  })}
                  {customBenefitsBurdenFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.benefitsBurdenHourlyRates[`custom-${idx}`] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={field.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0 pr-1">
                          <div className="min-w-0 flex-1">
                            <TruncatedLabelWithTooltip
                              label={field.label}
                              fullText={field.label}
                              labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomBenefitsBurdenFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP3_BURDEN3_WRAP}>
                            <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `benefitsCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(field.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `benefitsCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(field.percent)
                            })}
                            onChange={(e) => {
                              const k = `benefitsCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `benefitsCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = field.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `customBenefits:${idx}:brdn`
                              setCustomBenefitsBurdenFields(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              if (fieldLocks[brdnPath]?.locked || fieldLocks[`customBenefits:${idx}`]?.locked) {
                                if (draft === '' || Number.isNaN(v)) updateFieldLockValue(brdnPath, '')
                                else updateFieldLockValue(brdnPath, Math.round(v * 100) / 100)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`customBenefits:${idx}:brdn`]?.locked || fieldLocks[`customBenefits:${idx}`]?.locked)}
                            onToggle={() => toggleFieldLock(`customBenefits:${idx}:brdn`, () => customBenefitsBurdenFields[idx]?.percent)}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'benefitsCustom', customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `customBenefits:${idx}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setCustomBenefitsBurdenFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customBenefits:${idx}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`customBenefits:${idx}:hrly`, () => (safeCalculations.benefitsBurdenHourlyRates[`custom-${idx}`] || 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible pl-0.5 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`customBenefits:${idx}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'benefitsCustom', customIdx: idx, field: 'chgd', value: getAnnualInputDisplay(`customBenefits:${idx}:annual`, annualSpend) })}
                            onChange={(e) => { if (editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'benefitsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `customBenefits:${idx}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setCustomBenefitsBurdenFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customBenefits:${idx}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`customBenefits:${idx}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.benefitsBurdenHourlyRates[`custom-${idx}`] || 0))}
                          />
                        </div>
                        </div>
                      </div>
                      </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Benefits Burden */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomBenefitsBurden.name}
                      onChange={(e) => setNewCustomBenefitsBurden(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleAddCustomBenefitsBurden}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Benefits Burden Total */}
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 overflow-hidden">Total Benefits Burden</div>
                  <div className="flex w-full justify-end -translate-x-[5px]">
                    <div className={STEP3_BURDEN3_WRAP}>
                      <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                          <div className="text-right text-xs font-semibold text-primary px-0.5">
                            {safeCalculations.benefitsBurdenPercent.toFixed(2)}%
                          </div>
                          <div className="text-right text-xs font-bold text-gray-700 px-0.5">
                            ${safeCalculations.benefitsBurdenHourlyRate.toFixed(2)}
                          </div>
                          <div className="text-right text-xs font-bold text-primary pl-0.5 pr-2">
                            ${annualSpendFromEarnedHourly(safeCalculations.benefitsBurdenHourlyRate).toFixed(2)}
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Overheads */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Additional Overheads
                </h3>
                
                {/* Table Header */}
                <div className="mb-2 min-w-0 flex justify-end border-b border-gray-300 pb-1 pr-1.5 pl-1.5">
                  <div className={STEP3_BURDEN3_WRAP}>
                    <div className={`${STEP3_BURDEN3_GRID} text-xs font-semibold text-gray-600`}>
                        <div className="text-right whitespace-nowrap px-0.5">Brdn (%)</div>
                        <div className="text-right whitespace-nowrap px-0.5">Hrly ($)</div>
                        <div className="text-right whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                      </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {ADDITIONAL_OVERHEADS_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.additionalOverheadsHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <div className="min-w-0 pr-1">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP3_BURDEN3_WRAP}>
                            <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `additionalOverheads:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(additionalOverheadsPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `additionalOverheads:${option.id}`,
                              value: formatBrdnPercentForDisplay(additionalOverheadsPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `additionalOverheads:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `additionalOverheads:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = additionalOverheadsPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `additionalOverheads:${option.id}:brdn`
                              if (draft === '' || Number.isNaN(v)) {
                                setAdditionalOverheadsPercents(prev => ({ ...prev, [option.id]: '' }))
                                if (fieldLocks[brdnPath]?.locked || fieldLocks[`additionalOverheads:${option.id}`]?.locked) updateFieldLockValue(brdnPath, '')
                              } else {
                                const nv = Math.round(v * 100) / 100
                                setAdditionalOverheadsPercents(prev => ({ ...prev, [option.id]: nv }))
                                if (fieldLocks[brdnPath]?.locked || fieldLocks[`additionalOverheads:${option.id}`]?.locked) updateFieldLockValue(brdnPath, nv)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`additionalOverheads:${option.id}:brdn`]?.locked || fieldLocks[`additionalOverheads:${option.id}`]?.locked)}
                            onToggle={() => toggleFieldLock(`additionalOverheads:${option.id}:brdn`, () => additionalOverheadsPercents[option.id])}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'additionalOverheads', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `additionalOverheads:${option.id}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setAdditionalOverheadsPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`additionalOverheads:${option.id}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`additionalOverheads:${option.id}:hrly`, () => (safeCalculations.additionalOverheadsHourlyRates[option.id] || 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible pl-0.5 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`additionalOverheads:${option.id}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'additionalOverheads', rowId: option.id, field: 'chgd', value: getAnnualInputDisplay(`additionalOverheads:${option.id}:annual`, annualSpend) })}
                            onChange={(e) => { if (editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'additionalOverheads' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `additionalOverheads:${option.id}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setAdditionalOverheadsPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`additionalOverheads:${option.id}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`additionalOverheads:${option.id}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.additionalOverheadsHourlyRates[option.id] || 0))}
                          />
                        </div>
                        </div>
                      </div>
                      </div>
                      </div>
                    )
                  })}
                  {customAdditionalOverheadsFields.map((field, idx) => {
                    const hourlyRate = safeCalculations.additionalOverheadsHourlyRates[`custom-${idx}`] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={field.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0 pr-1">
                          <div className="min-w-0 flex-1">
                            <TruncatedLabelWithTooltip
                              label={field.label}
                              fullText={field.label}
                              labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomAdditionalOverheadsFields(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP3_BURDEN3_WRAP}>
                            <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `additionalOverheadsCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(field.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `additionalOverheadsCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(field.percent)
                            })}
                            onChange={(e) => {
                              const k = `additionalOverheadsCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `additionalOverheadsCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = field.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `customAdditionalOverheads:${idx}:brdn`
                              setCustomAdditionalOverheadsFields(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              if (fieldLocks[brdnPath]?.locked || fieldLocks[`customAdditionalOverheads:${idx}`]?.locked) {
                                if (draft === '' || Number.isNaN(v)) updateFieldLockValue(brdnPath, '')
                                else updateFieldLockValue(brdnPath, Math.round(v * 100) / 100)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`customAdditionalOverheads:${idx}:brdn`]?.locked || fieldLocks[`customAdditionalOverheads:${idx}`]?.locked)}
                            onToggle={() => toggleFieldLock(`customAdditionalOverheads:${idx}:brdn`, () => customAdditionalOverheadsFields[idx]?.percent)}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'additionalOverheadsCustom', customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `customAdditionalOverheads:${idx}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setCustomAdditionalOverheadsFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customAdditionalOverheads:${idx}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`customAdditionalOverheads:${idx}:hrly`, () => (safeCalculations.additionalOverheadsHourlyRates[`custom-${idx}`] || 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible pl-0.5 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`customAdditionalOverheads:${idx}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'additionalOverheadsCustom', customIdx: idx, field: 'chgd', value: getAnnualInputDisplay(`customAdditionalOverheads:${idx}:annual`, annualSpend) })}
                            onChange={(e) => { if (editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'additionalOverheadsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `customAdditionalOverheads:${idx}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setCustomAdditionalOverheadsFields(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customAdditionalOverheads:${idx}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`customAdditionalOverheads:${idx}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.additionalOverheadsHourlyRates[`custom-${idx}`] || 0))}
                          />
                        </div>
                        </div>
                      </div>
                      </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Additional Overheads */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center min-w-0">
                    <input
                      type="text"
                      value={newCustomAdditionalOverheads.name}
                      onChange={(e) => setNewCustomAdditionalOverheads(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleAddCustomAdditionalOverheads}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Additional Overheads Total */}
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 overflow-hidden break-words" title="Total Additional Overheads">Total Additional Overheads</div>
                  <div className="flex w-full justify-end -translate-x-[5px]">
                    <div className={STEP3_BURDEN3_WRAP}>
                      <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                          <div className="text-right text-xs font-semibold text-primary px-0.5">
                            {safeCalculations.additionalOverheadsPercent.toFixed(2)}%
                          </div>
                          <div className="text-right text-xs font-bold text-gray-700 px-0.5">
                            ${safeCalculations.additionalOverheadsHourlyRate.toFixed(2)}
                          </div>
                          <div className="text-right text-xs font-bold text-primary pl-0.5 pr-2">
                            ${annualSpendFromEarnedHourly(safeCalculations.additionalOverheadsHourlyRate).toFixed(2)}
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employee Costs */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Employee Costs
                </h3>
                
                {/* Table Header */}
                <div className="mb-2 min-w-0 flex justify-end border-b border-gray-300 pb-1 pr-1.5 pl-1.5">
                  <div className={STEP3_BURDEN3_WRAP}>
                    <div className={`${STEP3_BURDEN3_GRID} text-xs font-semibold text-gray-600`}>
                        <div className="text-right whitespace-nowrap px-0.5">Brdn (%)</div>
                        <div className="text-right whitespace-nowrap px-0.5">Hrly ($)</div>
                        <div className="text-right whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                      </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {EMPLOYEE_COSTS_OPTIONS.map(option => {
                    const hourlyRate = safeCalculations.employeeCostsHourlyRates[option.id] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={option.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                        <div className="min-w-0 pr-1">
                          <TruncatedLabelWithTooltip
                            label={option.label}
                            fullText={option.label.replace(/\n/g, ' ')}
                            labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                            wrapperClassName="flex items-start gap-1.5 min-w-0"
                          />
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP3_BURDEN3_WRAP}>
                            <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `employeeCosts:${option.id}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(employeeCostsPercents[option.id])
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `employeeCosts:${option.id}`,
                              value: formatBrdnPercentForDisplay(employeeCostsPercents[option.id])
                            })}
                            onChange={(e) => {
                              const k = `employeeCosts:${option.id}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `employeeCosts:${option.id}`
                              if (editingBrdnField?.key !== k) return
                              const stored = employeeCostsPercents[option.id]
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `employeeCosts:${option.id}:brdn`
                              if (draft === '' || Number.isNaN(v)) {
                                setEmployeeCostsPercents(prev => ({ ...prev, [option.id]: '' }))
                                if (fieldLocks[brdnPath]?.locked || fieldLocks[`employeeCosts:${option.id}`]?.locked) updateFieldLockValue(brdnPath, '')
                              } else {
                                const nv = Math.round(v * 100) / 100
                                setEmployeeCostsPercents(prev => ({ ...prev, [option.id]: nv }))
                                if (fieldLocks[brdnPath]?.locked || fieldLocks[`employeeCosts:${option.id}`]?.locked) updateFieldLockValue(brdnPath, nv)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`employeeCosts:${option.id}:brdn`]?.locked || fieldLocks[`employeeCosts:${option.id}`]?.locked)}
                            onToggle={() => toggleFieldLock(`employeeCosts:${option.id}:brdn`, () => employeeCostsPercents[option.id])}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'employeeCosts', rowId: option.id, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `employeeCosts:${option.id}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setEmployeeCostsPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`employeeCosts:${option.id}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`employeeCosts:${option.id}:hrly`, () => (safeCalculations.employeeCostsHourlyRates[option.id] || 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible pl-0.5 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`employeeCosts:${option.id}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'employeeCosts', rowId: option.id, field: 'chgd', value: getAnnualInputDisplay(`employeeCosts:${option.id}:annual`, annualSpend) })}
                            onChange={(e) => { if (editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'employeeCosts' && editingDollarField?.rowId === option.id && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `employeeCosts:${option.id}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setEmployeeCostsPercents(prev => ({ ...prev, [option.id]: pct }))
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`employeeCosts:${option.id}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`employeeCosts:${option.id}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.employeeCostsHourlyRates[option.id] || 0))}
                          />
                        </div>
                        </div>
                      </div>
                      </div>
                      </div>
                    )
                  })}
                  {customEmployeeCosts.map((cost, idx) => {
                    const hourlyRate = safeCalculations.employeeCostsHourlyRates[`custom-${idx}`] || 0
                    const annualSpend = annualSpendFromEarnedHourly(hourlyRate)
                    const workersWageNum = parseFloat(workersWage) || 0
                    return (
                      <div key={cost.id} className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0 pr-1">
                          <div className="min-w-0 flex-1">
                            <TruncatedLabelWithTooltip
                              label={cost.label}
                              fullText={cost.label}
                              labelClassName="text-gray-700 font-medium break-words min-w-0 whitespace-normal pr-1 text-xs leading-snug"
                              wrapperClassName="flex items-start gap-1.5 min-w-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomEmployeeCosts(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                          <div className={STEP3_BURDEN3_WRAP}>
                            <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <div className="flex items-center justify-end min-w-0">
                          <input
                            type="number"
                            step="0.01"
                            value={(() => {
                              const k = `employeeCostsCustom:${idx}`
                              return editingBrdnField?.key === k ? editingBrdnField.value : formatBrdnPercentForDisplay(cost.percent)
                            })()}
                            onFocus={() => setEditingBrdnField({
                              key: `employeeCostsCustom:${idx}`,
                              value: formatBrdnPercentForDisplay(cost.percent)
                            })}
                            onChange={(e) => {
                              const k = `employeeCostsCustom:${idx}`
                              if (editingBrdnField?.key === k) setEditingBrdnField({ key: k, value: e.target.value })
                            }}
                            onBlur={() => {
                              const k = `employeeCostsCustom:${idx}`
                              if (editingBrdnField?.key !== k) return
                              const stored = cost.percent
                              const before = formatBrdnPercentForDisplay(stored)
                              const draft = editingBrdnField.value.trim()
                              if (draft === before || (before === '' && draft === '')) {
                                setEditingBrdnField(null)
                                return
                              }
                              const v = parseFloat(draft)
                              const brdnPath = `customEmployeeCosts:${idx}:brdn`
                              setCustomEmployeeCosts(prev => {
                                const u = [...prev]
                                if (draft === '' || Number.isNaN(v)) u[idx] = { ...u[idx], percent: '' }
                                else u[idx] = { ...u[idx], percent: Math.round(v * 100) / 100 }
                                return u
                              })
                              if (fieldLocks[brdnPath]?.locked || fieldLocks[`customEmployeeCosts:${idx}`]?.locked) {
                                if (draft === '' || Number.isNaN(v)) updateFieldLockValue(brdnPath, '')
                                else updateFieldLockValue(brdnPath, Math.round(v * 100) / 100)
                              }
                              setEditingBrdnField(null)
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                          />
                          <span className="text-gray-500 text-xs ml-0.5">%</span>
                          </div>
                          <FieldLockButton
                            locked={!!(fieldLocks[`customEmployeeCosts:${idx}:brdn`]?.locked || fieldLocks[`customEmployeeCosts:${idx}`]?.locked)}
                            onToggle={() => toggleFieldLock(`customEmployeeCosts:${idx}:brdn`, () => customEmployeeCosts[idx]?.percent)}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly' ? editingDollarField.value : (hourlyRate > 0 ? hourlyRate.toFixed(2) : '')}
                            onFocus={() => setEditingDollarField({ section: 'employeeCostsCustom', customIdx: idx, field: 'hrly', value: hourlyRate > 0 ? hourlyRate.toFixed(2) : '' })}
                            onChange={(e) => { if (editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'hrly') {
                                const v = parseFloat(e.target.value)
                                const hrlyPath = `customEmployeeCosts:${idx}:hrly`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const pct = burdenPercentFromEarnedHourly(v, workersWageNum)
                                  setCustomEmployeeCosts(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[hrlyPath]?.locked) updateFieldLockValue(hrlyPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customEmployeeCosts:${idx}:hrly`]?.locked}
                            onToggle={() => toggleFieldLock(`customEmployeeCosts:${idx}:hrly`, () => (safeCalculations.employeeCostsHourlyRates[`custom-${idx}`] || 0))}
                          />
                        </div>
                        <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible pl-0.5 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd' ? editingDollarField.value : getAnnualInputDisplay(`customEmployeeCosts:${idx}:annual`, annualSpend)}
                            onFocus={() => setEditingDollarField({ section: 'employeeCostsCustom', customIdx: idx, field: 'chgd', value: getAnnualInputDisplay(`customEmployeeCosts:${idx}:annual`, annualSpend) })}
                            onChange={(e) => { if (editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                            onBlur={(e) => {
                              if (editingDollarField?.section === 'employeeCostsCustom' && editingDollarField?.customIdx === idx && editingDollarField?.field === 'chgd') {
                                const v = parseFloat(e.target.value)
                                const annualPath = `customEmployeeCosts:${idx}:annual`
                                if (workersWageNum > 0 && !Number.isNaN(v) && v >= 0) {
                                  const earnedHrly = v / PAID_CAPACITY
                                  const pct = burdenPercentFromEarnedHourly(earnedHrly, workersWageNum)
                                  setCustomEmployeeCosts(prev => { const u = [...prev]; u[idx] = { ...u[idx], percent: pct }; return u })
                                  if (fieldLocks[annualPath]?.locked) updateFieldLockValue(annualPath, v)
                                }
                                setEditingDollarField(null)
                              }
                            }}
                            className="burden-input w-[4.9rem] px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                            placeholder="0.00"
                          />
                          <FieldLockButton
                            locked={!!fieldLocks[`customEmployeeCosts:${idx}:annual`]?.locked}
                            onToggle={() => toggleFieldLock(`customEmployeeCosts:${idx}:annual`, () => annualSpendFromEarnedHourly(safeCalculations.employeeCostsHourlyRates[`custom-${idx}`] || 0))}
                          />
                        </div>
                        </div>
                      </div>
                      </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Custom Employee Cost */}
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                  <div className="flex gap-2 min-w-0 flex-wrap items-center">
                    <input
                      type="text"
                      value={newCustomEmployeeCost.name}
                      onChange={(e) => setNewCustomEmployeeCost(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Custom Entry"
                      className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleAddCustomEmployeeCost}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Employee Costs Total */}
                <div className="mt-3 flex flex-col gap-2 p-1.5 border-2 border-primary rounded-lg bg-primary/5 min-w-0">
                  <div className="text-gray-700 text-xs font-semibold min-w-0 overflow-hidden break-words" title="Total Employee Costs">Total Employee Costs</div>
                  <div className="flex w-full justify-end -translate-x-[5px]">
                    <div className={STEP3_BURDEN3_WRAP}>
                      <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                          <div className="text-right text-xs font-semibold text-primary px-0.5">
                            {safeCalculations.employeeCostsPercent.toFixed(2)}%
                          </div>
                          <div className="text-right text-xs font-bold text-gray-700 px-0.5">
                            ${safeCalculations.employeeCostsHourlyRate.toFixed(2)}
                          </div>
                          <div className="text-right text-xs font-bold text-primary pl-0.5 pr-2">
                            ${annualSpendFromEarnedHourly(safeCalculations.employeeCostsHourlyRate).toFixed(2)}
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Division Overhead */}
              <div className="mb-6 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-3">
                  Division Overhead
                </h3>
                
                {/* Table Header */}
                <div className="mb-2 min-w-0 flex justify-end border-b border-gray-300 pb-1 pr-1.5 pl-1.5">
                  <div className={STEP3_BURDEN3_WRAP}>
                    <div className={`${STEP3_BURDEN3_GRID} text-xs font-semibold text-gray-600`}>
                      <div className="text-right whitespace-nowrap px-0.5">Brdn (%)</div>
                      <div className="text-right whitespace-nowrap px-0.5">Hrly ($)</div>
                      <div className="text-right whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                    <div className="flex items-start gap-2 min-w-0 pr-1">
                      <label className="text-gray-700 text-xs font-medium break-words min-w-0 leading-snug">
                        Division Overhead
                      </label>
                      <div
                        ref={divisionOverheadTooltipTriggerRef}
                        className="relative flex-shrink-0"
                        onMouseEnter={() => { updateDivisionOverheadTooltipPos(); setDivisionOverheadTooltipOpen(true) }}
                        onMouseLeave={() => setDivisionOverheadTooltipOpen(false)}
                      >
                        <svg 
                          className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                      <div className={STEP3_BURDEN3_WRAP}>
                        <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                    <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                      <div className="flex items-center justify-end min-w-0">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'divisionOverhead' ? editingBrdnField.value : formatBrdnPercentForDisplay(divisionOverheadPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'divisionOverhead',
                          value: formatBrdnPercentForDisplay(divisionOverheadPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'divisionOverhead') setEditingBrdnField({ key: 'divisionOverhead', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'divisionOverhead') return
                          const before = formatBrdnPercentForDisplay(divisionOverheadPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) {
                            setDivisionOverheadPercent('')
                            if (fieldLocks['divisionOverheadPercent:brdn']?.locked || fieldLocks.divisionOverheadPercent?.locked) updateFieldLockValue('divisionOverheadPercent:brdn', '')
                          } else {
                            const nv = Math.round(v * 100) / 100
                            setDivisionOverheadPercent(nv)
                            if (fieldLocks['divisionOverheadPercent:brdn']?.locked || fieldLocks.divisionOverheadPercent?.locked) updateFieldLockValue('divisionOverheadPercent:brdn', nv)
                          }
                          setEditingBrdnField(null)
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs ml-0.5">%</span>
                      </div>
                      <FieldLockButton
                        locked={!!(fieldLocks['divisionOverheadPercent:brdn']?.locked || fieldLocks.divisionOverheadPercent?.locked)}
                        onToggle={() => toggleFieldLock('divisionOverheadPercent:brdn', () => divisionOverheadPercent)}
                      />
                    </div>
                    <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'hrly' ? editingDollarField.value : (safeCalculations.divisionOverheadCharged > 0 ? safeCalculations.divisionOverheadHourlyRate.toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'divisionOverhead', field: 'hrly', value: safeCalculations.divisionOverheadCharged > 0 ? safeCalculations.divisionOverheadHourlyRate.toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'hrly') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.costBaseBeforeOverheadAndProfit || 0
                            if (!Number.isNaN(v) && v >= 0 && base + v > 0) {
                              const pct = 100 * v / (base + v)
                              setDivisionOverheadPercent(pct)
                              if (fieldLocks['divisionOverheadPercent:hrly']?.locked) updateFieldLockValue('divisionOverheadPercent:hrly', v)
                            }
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <FieldLockButton
                        locked={!!fieldLocks['divisionOverheadPercent:hrly']?.locked}
                        onToggle={() => toggleFieldLock('divisionOverheadPercent:hrly', () => safeCalculations.divisionOverheadHourlyRate)}
                      />
                    </div>
                    <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible pl-0.5 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'chgd' ? editingDollarField.value : (safeCalculations.divisionOverheadAnnualSpend > 0 ? safeCalculations.divisionOverheadAnnualSpend.toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'divisionOverhead', field: 'chgd', value: safeCalculations.divisionOverheadAnnualSpend > 0 ? safeCalculations.divisionOverheadAnnualSpend.toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'divisionOverhead' && editingDollarField?.field === 'chgd') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.costBaseBeforeOverheadAndProfit || 0
                            const H = safeCalculations.totalHoursAvailable || 0
                            const hourly = H > 0 ? v / H : 0
                            if (!Number.isNaN(v) && v >= 0 && H > 0 && base + hourly > 0) {
                              const pct = 100 * hourly / (base + hourly)
                              setDivisionOverheadPercent(pct)
                              if (fieldLocks['divisionOverheadPercent:annual']?.locked) updateFieldLockValue('divisionOverheadPercent:annual', v)
                            }
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <FieldLockButton
                        locked={!!fieldLocks['divisionOverheadPercent:annual']?.locked}
                        onToggle={() => toggleFieldLock('divisionOverheadPercent:annual', () => safeCalculations.divisionOverheadAnnualSpend)}
                      />
                    </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Company Overhead */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  General Company Overhead
                </h3>
                
                {/* Table Header */}
                <div className="mb-2 min-w-0 flex justify-end border-b border-gray-300 pb-1 pr-1.5 pl-1.5">
                  <div className={STEP3_BURDEN3_WRAP}>
                    <div className={`${STEP3_BURDEN3_GRID} text-xs font-semibold text-gray-600`}>
                      <div className="text-right whitespace-nowrap px-0.5">Brdn (%)</div>
                      <div className="text-right whitespace-nowrap px-0.5">Hrly ($)</div>
                      <div className="text-right whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                    <label className="text-gray-700 text-xs font-medium break-words min-w-0 pr-1 leading-snug">
                      General Company Overhead
                    </label>
                    <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                      <div className={STEP3_BURDEN3_WRAP}>
                        <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                    <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                      <div className="flex items-center justify-end min-w-0">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'generalOverhead' ? editingBrdnField.value : formatBrdnPercentForDisplay(generalCompanyOverheadPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'generalOverhead',
                          value: formatBrdnPercentForDisplay(generalCompanyOverheadPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'generalOverhead') setEditingBrdnField({ key: 'generalOverhead', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'generalOverhead') return
                          const before = formatBrdnPercentForDisplay(generalCompanyOverheadPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) {
                            setGeneralCompanyOverheadPercent('')
                            if (fieldLocks['generalCompanyOverheadPercent:brdn']?.locked || fieldLocks.generalCompanyOverheadPercent?.locked) updateFieldLockValue('generalCompanyOverheadPercent:brdn', '')
                          } else {
                            const nv = Math.round(v * 100) / 100
                            setGeneralCompanyOverheadPercent(nv)
                            if (fieldLocks['generalCompanyOverheadPercent:brdn']?.locked || fieldLocks.generalCompanyOverheadPercent?.locked) updateFieldLockValue('generalCompanyOverheadPercent:brdn', nv)
                          }
                          setEditingBrdnField(null)
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs ml-0.5">%</span>
                      </div>
                      <FieldLockButton
                        locked={!!(fieldLocks['generalCompanyOverheadPercent:brdn']?.locked || fieldLocks.generalCompanyOverheadPercent?.locked)}
                        onToggle={() => toggleFieldLock('generalCompanyOverheadPercent:brdn', () => generalCompanyOverheadPercent)}
                      />
                    </div>
                    <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'hrly' ? editingDollarField.value : (safeCalculations.generalCompanyOverheadCharged > 0 ? safeCalculations.generalCompanyOverheadHourlyRate.toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'generalOverhead', field: 'hrly', value: safeCalculations.generalCompanyOverheadCharged > 0 ? safeCalculations.generalCompanyOverheadHourlyRate.toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'hrly') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.totalAfterDivisionOverhead || 0
                            if (!Number.isNaN(v) && v >= 0 && base + v > 0) {
                              const pct = 100 * v / (base + v)
                              setGeneralCompanyOverheadPercent(pct)
                              if (fieldLocks['generalCompanyOverheadPercent:hrly']?.locked) updateFieldLockValue('generalCompanyOverheadPercent:hrly', v)
                            }
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <FieldLockButton
                        locked={!!fieldLocks['generalCompanyOverheadPercent:hrly']?.locked}
                        onToggle={() => toggleFieldLock('generalCompanyOverheadPercent:hrly', () => safeCalculations.generalCompanyOverheadHourlyRate)}
                      />
                    </div>
                    <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible pl-0.5 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'chgd' ? editingDollarField.value : (safeCalculations.generalCompanyOverheadAnnualSpend > 0 ? safeCalculations.generalCompanyOverheadAnnualSpend.toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'generalOverhead', field: 'chgd', value: safeCalculations.generalCompanyOverheadAnnualSpend > 0 ? safeCalculations.generalCompanyOverheadAnnualSpend.toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'generalOverhead' && editingDollarField?.field === 'chgd') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.totalAfterDivisionOverhead || 0
                            const H = safeCalculations.totalHoursAvailable || 0
                            const hourly = H > 0 ? v / H : 0
                            if (!Number.isNaN(v) && v >= 0 && H > 0 && base + hourly > 0) {
                              const pct = 100 * hourly / (base + hourly)
                              setGeneralCompanyOverheadPercent(pct)
                              if (fieldLocks['generalCompanyOverheadPercent:annual']?.locked) updateFieldLockValue('generalCompanyOverheadPercent:annual', v)
                            }
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <FieldLockButton
                        locked={!!fieldLocks['generalCompanyOverheadPercent:annual']?.locked}
                        onToggle={() => toggleFieldLock('generalCompanyOverheadPercent:annual', () => safeCalculations.generalCompanyOverheadAnnualSpend)}
                      />
                    </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit */}
              <div className="mb-4 min-w-0">
                <h3 className="text-base font-semibold text-neutral mb-2">
                  Profit
                </h3>
                
                {/* Table Header */}
                <div className="mb-2 min-w-0 flex justify-end border-b border-gray-300 pb-1 pr-1.5 pl-1.5">
                  <div className={STEP3_BURDEN3_WRAP}>
                    <div className={`${STEP3_BURDEN3_GRID} text-xs font-semibold text-gray-600`}>
                      <div className="text-right whitespace-nowrap px-0.5">Brdn (%)</div>
                      <div className="text-right whitespace-nowrap px-0.5">Hrly ($)</div>
                      <div className="text-right whitespace-nowrap text-[10px] sm:text-xs leading-tight tracking-tight pl-0.5 pr-2">Spend/yr ($)</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex flex-col gap-2 p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 min-w-0">
                    <label className="text-gray-700 text-xs font-medium break-words min-w-0 pr-1 leading-snug">
                      Profit
                    </label>
                    <div className="flex w-full min-w-0 justify-end translate-x-[5px]">
                      <div className={STEP3_BURDEN3_WRAP}>
                        <div className={`${STEP3_BURDEN3_GRID} items-center`}>
                    <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                      <div className="flex items-center justify-end min-w-0">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'profit' ? editingBrdnField.value : formatBrdnPercentForDisplay(profitPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'profit',
                          value: formatBrdnPercentForDisplay(profitPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'profit') setEditingBrdnField({ key: 'profit', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'profit') return
                          const before = formatBrdnPercentForDisplay(profitPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) {
                            setProfitPercent('')
                            if (fieldLocks['profitPercent:brdn']?.locked || fieldLocks.profitPercent?.locked) updateFieldLockValue('profitPercent:brdn', '')
                          } else {
                            const nv = Math.round(v * 100) / 100
                            setProfitPercent(nv)
                            if (fieldLocks['profitPercent:brdn']?.locked || fieldLocks.profitPercent?.locked) updateFieldLockValue('profitPercent:brdn', nv)
                          }
                          setEditingBrdnField(null)
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs ml-0.5">%</span>
                      </div>
                      <FieldLockButton
                        locked={!!(fieldLocks['profitPercent:brdn']?.locked || fieldLocks.profitPercent?.locked)}
                        onToggle={() => toggleFieldLock('profitPercent:brdn', () => profitPercent)}
                      />
                    </div>
                    <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'profit' && editingDollarField?.field === 'hrly' ? editingDollarField.value : (safeCalculations.profitCharged > 0 ? safeCalculations.profitHourlyRate.toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'profit', field: 'hrly', value: safeCalculations.profitCharged > 0 ? safeCalculations.profitHourlyRate.toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'profit' && editingDollarField?.field === 'hrly') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'profit' && editingDollarField?.field === 'hrly') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.totalAfterGeneralOverhead || 0
                            if (!Number.isNaN(v) && v >= 0 && base + v > 0) {
                              const pct = 100 * v / (base + v)
                              setProfitPercent(pct)
                              if (fieldLocks['profitPercent:hrly']?.locked) updateFieldLockValue('profitPercent:hrly', v)
                            }
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <FieldLockButton
                        locked={!!fieldLocks['profitPercent:hrly']?.locked}
                        onToggle={() => toggleFieldLock('profitPercent:hrly', () => safeCalculations.profitHourlyRate)}
                      />
                    </div>
                    <div className="flex flex-col items-end justify-center gap-0.5 min-w-0 overflow-visible pl-0.5 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingDollarField?.section === 'profit' && editingDollarField?.field === 'chgd' ? editingDollarField.value : (safeCalculations.profitCharged > 0 ? annualSpendFromEarnedHourly(safeCalculations.profitCharged).toFixed(2) : '')}
                        onFocus={() => setEditingDollarField({ section: 'profit', field: 'chgd', value: safeCalculations.profitCharged > 0 ? annualSpendFromEarnedHourly(safeCalculations.profitCharged).toFixed(2) : '' })}
                        onChange={(e) => { if (editingDollarField?.section === 'profit' && editingDollarField?.field === 'chgd') setEditingDollarField(prev => ({ ...prev, value: e.target.value })) }}
                        onBlur={(e) => {
                          if (editingDollarField?.section === 'profit' && editingDollarField?.field === 'chgd') {
                            const v = parseFloat(e.target.value)
                            const base = safeCalculations.totalAfterGeneralOverhead || 0
                            const hourly = v / PAID_CAPACITY
                            if (!Number.isNaN(v) && v >= 0 && base + hourly > 0) {
                              const pct = 100 * hourly / (base + hourly)
                              setProfitPercent(pct)
                              if (fieldLocks['profitPercent:annual']?.locked) updateFieldLockValue('profitPercent:annual', v)
                            }
                            setEditingDollarField(null)
                          }
                        }}
                        className="burden-input w-11 px-1 py-0.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-right text-xs no-spinner"
                        placeholder="0.00"
                      />
                      <FieldLockButton
                        locked={!!fieldLocks['profitPercent:annual']?.locked}
                        onToggle={() => toggleFieldLock('profitPercent:annual', () => annualSpendFromEarnedHourly(safeCalculations.profitCharged))}
                      />
                    </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Results - Burden / Hour Charged */}
          <div className="min-w-0 w-full flex-1 basis-0 print:w-full">
            <div 
              ref={step3Ref}
              className="step-4-print-root w-full min-w-0 overflow-x-hidden overflow-y-auto scroll-smooth rounded-lg bg-white px-5 py-4 shadow-lg sticky top-4 max-h-[calc(100vh-2rem)] print:static print:top-auto print:max-h-none print:overflow-visible print:p-2 print:shadow-none"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
            >
              <h2 className="text-xl font-bold text-primary mb-3 border-b-2 border-primary pb-2 print:hidden">
                Step 4: Results - Burden / Hour Charged
              </h2>
              {(employeeName || '').trim() ? (
                <p className="text-base font-semibold text-neutral mb-3 print:mb-2 print:text-sm">
                  {(employeeName || '').trim()}
                </p>
              ) : null}

              {/* Full print report: Step 1 -> Step 4 */}
              <div className="hidden print:block space-y-4 text-[11px] leading-snug">
                <div className="text-center border-b border-gray-300 pb-2">
                  <img src="/logo.png" alt="Profitable Restorer" className="h-12 w-auto mx-auto object-contain" />
                  <div className="text-base font-bold text-primary mt-1">Labor Rate Calculator</div>
                  <div className="mt-3 text-sm font-bold text-black">
                    Employee: {(employeeName || '').trim() || '________________________'}
                  </div>
                </div>

                <section>
                  <h3 className="text-sm font-extrabold text-black mb-1 border-b border-gray-200 pb-0.5">Step 1: Paid Capacity</h3>
                  <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 text-[10px] font-semibold border-b border-gray-200 pb-0.5">
                    <div className="text-xs font-bold text-black">Hours Not Worked</div><div className="text-right">Hours Allocated</div><div className="text-right">Brdn Chg (%)</div>
                  </div>
                  {allHoursNotWorkedOptions.map(option => {
                    const hrs = parseFloat(hoursNotWorked[option.id]) || 0
                    const pct = safeCalculations.hoursNotWorkedPercentages[option.id] || 0
                    return <div key={`p1-hnw-${option.id}`} className="grid grid-cols-[1fr_5rem_5rem] gap-2"><div>{option.label}</div><div className="text-right">{hrs} hrs</div><div className="text-right">{pct.toFixed(2)}%</div></div>
                  })}
                  <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 border-t border-gray-200 pt-0.5 font-bold text-primary"><div>Total PTO, Holidays and Sick Time</div><div className="text-right">{safeCalculations.totalHoursNotWorked} hrs</div><div className="text-right">{safeCalculations.totalHoursNotWorkedPercent.toFixed(2)}%</div></div>

                  <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 text-[10px] font-semibold border-b border-gray-200 pb-0.5 mt-2">
                    <div className="text-xs font-bold text-black">Non-Billable Hours</div><div className="text-right">Hours Allocated</div><div className="text-right">Brdn Chg (%)</div>
                  </div>
                  {allNonBillableOptions.map(option => {
                    const hrs = parseFloat(nonBillableHours[option.id]) || 0
                    const pct = safeCalculations.nonBillableHoursPercentages[option.id] || 0
                    return <div key={`p1-nbh-${option.id}`} className="grid grid-cols-[1fr_5rem_5rem] gap-2"><div>{option.label}</div><div className="text-right">{hrs} hrs</div><div className="text-right">{pct.toFixed(2)}%</div></div>
                  })}
                  <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 border-t border-gray-200 pt-0.5 font-bold text-primary"><div>Total Non-Billable Hours</div><div className="text-right">{safeCalculations.totalNonBillableHours} hrs</div><div className="text-right">{safeCalculations.totalNonBillableHoursPercent.toFixed(2)}%</div></div>
                  <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 border-t border-primary pt-0.5 font-bold text-primary mt-1"><div>Total Hours Available For Work</div><div className="text-right">{safeCalculations.totalHoursAvailable.toFixed(2)} hrs</div><div className="text-right">{(safeCalculations.utilizationPercent * 100).toFixed(2)}%</div></div>
                </section>

                <section>
                  <h3 className="text-sm font-extrabold text-black mb-1 border-b border-gray-200 pb-0.5">Step 2: Wage Burden</h3>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>Workers Wage</div><div className="font-semibold">${(parseFloat(workersWage) || 0).toFixed(2)}/hr</div>
                    <div>Burden/hour to charge</div><div className="font-semibold">${safeCalculations.workersWageCharged.toFixed(2)}/hr</div>
                  </div>

                  <div className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2 text-[10px] font-semibold border-b border-gray-200 pb-0.5 mt-2"><div className="text-xs font-bold text-black">Mandatory Payroll Tax Burden</div><div className="text-right">Brdn (%)</div><div className="text-right">Hrly ($)</div><div className="text-right">Spend/yr ($)</div></div>
                  {MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => { const pct = parseFloat(mandatoryPayrollTaxPercents[opt.id]) || 0; const hrly = safeCalculations.payrollTaxHourlyRates[opt.id] || 0; return <div key={`p2-mpt-${opt.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{opt.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}
                  {customPayrollTaxFields.map((f, idx) => { const pct = parseFloat(f.percent) || 0; const hrly = safeCalculations.payrollTaxHourlyRates[`custom-${idx}`] || 0; return <div key={`p2-cpt-${f.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{f.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}

                  <div className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2 text-[10px] font-semibold border-b border-gray-200 pb-0.5 mt-2"><div className="text-xs font-bold text-black">Mandatory Worker Burden</div><div className="text-right">Brdn (%)</div><div className="text-right">Hrly ($)</div><div className="text-right">Spend/yr ($)</div></div>
                  {MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => { const pct = parseFloat(mandatoryWorkerBurdenPercents[opt.id]) || 0; const hrly = safeCalculations.workerBurdenHourlyRates[opt.id] || 0; return <div key={`p2-mwb-${opt.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{opt.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}
                  {customWorkerBurdenFields.map((f, idx) => { const pct = parseFloat(f.percent) || 0; const hrly = safeCalculations.workerBurdenHourlyRates[`custom-${idx}`] || 0; return <div key={`p2-cwb-${f.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{f.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}
                  <div className="flex justify-between border-t border-primary pt-0.5 font-bold text-primary mt-1"><span>Total Wage Burden</span><span>${safeCalculations.totalMandatoryBurdenCharged.toFixed(2)}/hr</span></div>
                </section>

                <section>
                  <h3 className="text-sm font-extrabold text-black mb-1 border-b border-gray-200 pb-0.5">Step 3: Overhead and Profit</h3>

                  <div className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2 text-[10px] font-semibold border-b border-gray-200 pb-0.5"><div className="text-xs font-bold text-black">Benefits Burden</div><div className="text-right">Brdn (%)</div><div className="text-right">Hrly ($)</div><div className="text-right">Spend/yr ($)</div></div>
                  {BENEFITS_BURDEN_OPTIONS.map(opt => { const pct = parseFloat(benefitsBurdenPercents[opt.id]) || 0; const hrly = safeCalculations.benefitsBurdenHourlyRates[opt.id] || 0; return <div key={`p3-ben-${opt.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{opt.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}
                  {customBenefitsBurdenFields.map((f, idx) => { const pct = parseFloat(f.percent) || 0; const hrly = safeCalculations.benefitsBurdenHourlyRates[`custom-${idx}`] || 0; return <div key={`p3-cben-${f.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{f.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}

                  <div className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2 text-[10px] font-semibold border-b border-gray-200 pb-0.5 mt-2"><div className="text-xs font-bold text-black">Additional Overheads</div><div className="text-right">Brdn (%)</div><div className="text-right">Hrly ($)</div><div className="text-right">Spend/yr ($)</div></div>
                  {ADDITIONAL_OVERHEADS_OPTIONS.map(opt => { const pct = parseFloat(additionalOverheadsPercents[opt.id]) || 0; const hrly = safeCalculations.additionalOverheadsHourlyRates[opt.id] || 0; return <div key={`p3-ao-${opt.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{opt.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}
                  {customAdditionalOverheadsFields.map((f, idx) => { const pct = parseFloat(f.percent) || 0; const hrly = safeCalculations.additionalOverheadsHourlyRates[`custom-${idx}`] || 0; return <div key={`p3-cao-${f.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{f.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}

                  <div className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2 text-[10px] font-semibold border-b border-gray-200 pb-0.5 mt-2"><div className="text-xs font-bold text-black">Employee Costs</div><div className="text-right">Brdn (%)</div><div className="text-right">Hrly ($)</div><div className="text-right">Spend/yr ($)</div></div>
                  {EMPLOYEE_COSTS_OPTIONS.map(opt => { const pct = parseFloat(employeeCostsPercents[opt.id]) || 0; const hrly = safeCalculations.employeeCostsHourlyRates[opt.id] || 0; return <div key={`p3-ec-${opt.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{opt.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}
                  {customEmployeeCosts.map((f, idx) => { const pct = parseFloat(f.percent) || 0; const hrly = safeCalculations.employeeCostsHourlyRates[`custom-${idx}`] || 0; return <div key={`p3-cec-${f.id}`} className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>{f.label}</div><div className="text-right">{pct.toFixed(2)}%</div><div className="text-right">${hrly.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(hrly).toFixed(2)}</div></div> })}

                  <div className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2 text-[10px] font-semibold border-b border-gray-200 pb-0.5 mt-2"><div className="text-xs font-bold text-black">Division Overhead / General Company Overhead / Profit</div><div className="text-right">Brdn (%)</div><div className="text-right">Hrly ($)</div><div className="text-right">Spend/yr ($)</div></div>
                  <div className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>Division Overhead</div><div className="text-right">{(parseFloat(divisionOverheadPercent) || 0).toFixed(2)}%</div><div className="text-right">${safeCalculations.divisionOverheadCharged.toFixed(2)}</div><div className="text-right">${safeCalculations.divisionOverheadAnnualSpend.toFixed(2)}</div></div>
                  <div className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>General Company Overhead</div><div className="text-right">{(parseFloat(generalCompanyOverheadPercent) || 0).toFixed(2)}%</div><div className="text-right">${safeCalculations.generalCompanyOverheadCharged.toFixed(2)}</div><div className="text-right">${safeCalculations.generalCompanyOverheadAnnualSpend.toFixed(2)}</div></div>
                  <div className="grid grid-cols-[1fr_3.2rem_3.5rem_4.2rem] gap-2"><div>Profit</div><div className="text-right">{(parseFloat(profitPercent) || 0).toFixed(2)}%</div><div className="text-right">${safeCalculations.profitCharged.toFixed(2)}</div><div className="text-right">${annualSpendFromEarnedHourly(safeCalculations.profitCharged).toFixed(2)}</div></div>
                </section>

                <section style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
                  <h3 className="text-sm font-extrabold text-black mb-1 border-b border-gray-200 pb-0.5">Step 4: Results - Burden / Hour Charged</h3>
                  <div className="text-xs font-bold text-black mb-0.5">Workers Wage</div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>Workers Wage (Earned)</div><div className="font-semibold">${(parseFloat(workersWage) || 0).toFixed(2)}/hr</div>
                    <div>Workers Wage (Charged)</div><div className="font-semibold">${safeCalculations.workersWageCharged.toFixed(2)}/hr</div>
                    <div className="text-gray-600"></div><div className="text-gray-600">= ${(parseFloat(workersWage) || 0).toFixed(2)} ÷ {(safeCalculations.utilizationPercent * 100).toFixed(2)}%</div>
                  </div>
                  <div className="text-xs font-bold text-black mt-2 mb-0.5">Detailed Breakdown</div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>Paid Capacity</div><div className="font-semibold">{(safeCalculations.utilizationPercent * 100).toFixed(2)}%</div>
                    <div>Workers Wage</div><div className="font-semibold">${safeCalculations.workersWageCharged.toFixed(2)}/hr</div>
                  </div>

                  <div className="text-xs font-bold text-black mt-2 mb-0.5">Mandatory Burden</div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    {MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => <><div key={`p4-mpt-l-${opt.id}`}>{opt.label}</div><div key={`p4-mpt-v-${opt.id}`} className="font-semibold">${(safeCalculations.payrollTaxCharged[opt.id] || 0).toFixed(2)}/hr</div></>)}
                    {customPayrollTaxFields.map((field, idx) => <><div key={`p4-cpt-l-${field.id}`}>{field.label}</div><div key={`p4-cpt-v-${field.id}`} className="font-semibold">${(safeCalculations.payrollTaxCharged[`custom-${idx}`] || 0).toFixed(2)}/hr</div></>)}
                    {MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => <><div key={`p4-mwb-l-${opt.id}`}>{opt.label}</div><div key={`p4-mwb-v-${opt.id}`} className="font-semibold">${(safeCalculations.workerBurdenCharged[opt.id] || 0).toFixed(2)}/hr</div></>)}
                    {customWorkerBurdenFields.map((field, idx) => <><div key={`p4-cwb-l-${field.id}`}>{field.label}</div><div key={`p4-cwb-v-${field.id}`} className="font-semibold">${(safeCalculations.workerBurdenCharged[`custom-${idx}`] || 0).toFixed(2)}/hr</div></>)}
                    <div className="font-bold text-primary">Total</div><div className="font-bold text-primary">${safeCalculations.totalMandatoryBurdenCharged.toFixed(2)}/hr</div>
                  </div>

                  <div className="text-xs font-bold text-black mt-2 mb-0.5">Benefits Burden</div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    {BENEFITS_BURDEN_OPTIONS.map(opt => <><div key={`p4-ben-l-${opt.id}`}>{opt.label}</div><div key={`p4-ben-v-${opt.id}`} className="font-semibold">${(safeCalculations.benefitsBurdenCharged[opt.id] || 0).toFixed(2)}/hr</div></>)}
                    {customBenefitsBurdenFields.map((field, idx) => <><div key={`p4-cben-l-${field.id}`}>{field.label}</div><div key={`p4-cben-v-${field.id}`} className="font-semibold">${(safeCalculations.benefitsBurdenCharged[`custom-${idx}`] || 0).toFixed(2)}/hr</div></>)}
                  </div>

                  <div className="text-xs font-bold text-black mt-2 mb-0.5">Additional Overheads</div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    {ADDITIONAL_OVERHEADS_OPTIONS.map(opt => <><div key={`p4-ao-l-${opt.id}`}>{opt.label}</div><div key={`p4-ao-v-${opt.id}`} className="font-semibold">${(safeCalculations.additionalOverheadsCharged[opt.id] || 0).toFixed(2)}/hr</div></>)}
                    {customAdditionalOverheadsFields.map((field, idx) => <><div key={`p4-cao-l-${field.id}`}>{field.label}</div><div key={`p4-cao-v-${field.id}`} className="font-semibold">${(safeCalculations.additionalOverheadsCharged[`custom-${idx}`] || 0).toFixed(2)}/hr</div></>)}
                  </div>

                  <div className="text-xs font-bold text-black mt-2 mb-0.5">Employee Costs</div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    {EMPLOYEE_COSTS_OPTIONS.map(opt => <><div key={`p4-ec-l-${opt.id}`}>{opt.label}</div><div key={`p4-ec-v-${opt.id}`} className="font-semibold">${(safeCalculations.employeeCostsCharged[opt.id] || 0).toFixed(2)}/hr</div></>)}
                    {customEmployeeCosts.map((cost, idx) => <><div key={`p4-cec-l-${cost.id}`}>{cost.label}</div><div key={`p4-cec-v-${cost.id}`} className="font-semibold">${(safeCalculations.employeeCostsCharged[`custom-${idx}`] || 0).toFixed(2)}/hr</div></>)}
                  </div>

                  <div className="text-xs font-bold text-black mt-2 mb-0.5">Overhead and Profit</div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>Division Overhead ({(parseFloat(divisionOverheadPercent) || 0).toFixed(2)}%)</div><div className="font-semibold">${safeCalculations.divisionOverheadCharged.toFixed(2)}/hr</div>
                    <div>General Company Overhead ({(parseFloat(generalCompanyOverheadPercent) || 0).toFixed(2)}%)</div><div className="font-semibold">${safeCalculations.generalCompanyOverheadCharged.toFixed(2)}/hr</div>
                    <div>Profit ({(parseFloat(profitPercent) || 0).toFixed(2)}%)</div><div className="font-semibold">${safeCalculations.profitCharged.toFixed(2)}/hr</div>
                  </div>
                  <div className="flex justify-between border-t border-b border-primary py-1 text-sm mt-1">
                    <span className="font-bold text-primary">Total Labor Rate</span>
                    <span className="font-bold text-primary">${safeCalculations.totalLaborRate.toFixed(2)}/hr</span>
                  </div>
                </section>
              </div>

              {/* Key Calculation Display */}
              <div className="mb-3 p-3 bg-primary/10 rounded-lg border-2 border-primary print:hidden">
                <div className="space-y-1.5 print:space-y-1">
                  <div>
                    <div className="text-xs text-gray-600 print:text-[10px]">Workers Wage (Earned)</div>
                    <div className="text-lg font-bold text-primary print:text-base">${(parseFloat(workersWage) || 0).toFixed(2)}/hr</div>
                  </div>
                  <div className="border-t border-primary/20 pt-1.5 print:pt-1">
                    <div className="text-xs text-gray-600 print:text-[10px]">Workers Wage (Charged)</div>
                    <div className="text-lg font-bold text-primary print:text-base">${safeCalculations.workersWageCharged.toFixed(2)}/hr</div>
                      <div className="text-xs text-gray-500 mt-1 whitespace-nowrap print:text-[10px] print:mt-0.5">
                        = ${(parseFloat(workersWage) || 0).toFixed(2)} ÷ {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 print:hidden">
                <h3 className="text-sm font-semibold text-neutral mb-2 print:text-xs print:mb-1 print:leading-tight">
                  Detailed Breakdown
                </h3>
                
                <div className="space-y-3 text-sm print:space-y-1 print:text-[11px] print:leading-snug">
                  {/* Paid Capacity summary */}
                  <div className="border-b border-gray-200 pb-2 print:pb-0.5">
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-700 min-w-0 truncate">Paid Capacity</span>
                      <span className="font-bold text-primary shrink-0">
                        {(safeCalculations.utilizationPercent * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Workers Wage */}
                  <div className="border-b border-gray-200 pb-2 print:pb-0.5">
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-700 min-w-0 truncate">Workers Wage</span>
                      <span className="font-bold text-primary shrink-0">${safeCalculations.workersWageCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* Mandatory Burden */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs print:mb-0 print:leading-tight">Mandatory Burden</h4>
                    <div className="ml-2 space-y-1 print:ml-1.5 print:space-y-0">
                      {/* Mandatory Payroll Tax Burden items */}
                      {MANDATORY_PAYROLL_TAX_OPTIONS.map(opt => {
                        const charged = safeCalculations.payrollTaxCharged[opt.id] || 0
                        return (
                          <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                            <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                            <span className="font-semibold text-primary shrink-0">${charged.toFixed(2)}/hr</span>
                          </div>
                        )
                      })}
                      {customPayrollTaxFields.map((field, idx) => (
                        <div key={field.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{field.label}:</span>
                          <span className="font-semibold text-primary shrink-0">${(safeCalculations.payrollTaxCharged[`custom-${idx}`] || 0).toFixed(2)}/hr</span>
                        </div>
                      ))}
                      {/* Mandatory Worker Burden items */}
                      {MANDATORY_WORKER_BURDEN_OPTIONS.map(opt => {
                        const charged = safeCalculations.workerBurdenCharged[opt.id] || 0
                        return (
                          <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                            <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                            <span className="font-semibold text-primary shrink-0">${charged.toFixed(2)}/hr</span>
                          </div>
                        )
                      })}
                      {customWorkerBurdenFields.map((field, idx) => (
                        <div key={field.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{field.label}:</span>
                          <span className="font-semibold text-primary shrink-0">${(safeCalculations.workerBurdenCharged[`custom-${idx}`] || 0).toFixed(2)}/hr</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold text-gray-700 pt-1 border-t border-gray-200 mt-1 gap-2 min-w-0 print:pt-0.5 print:mt-0.5">
                        <span className="text-xs min-w-0">Total:</span>
                        <span className="text-primary text-xs shrink-0">${safeCalculations.totalMandatoryBurdenCharged.toFixed(2)}/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Burden */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs print:mb-0 print:leading-tight">Benefits Burden</h4>
                    <div className="ml-2 space-y-1 print:ml-1.5 print:space-y-0">
                      {BENEFITS_BURDEN_OPTIONS.map(opt => (
                        <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.benefitsBurdenCharged[opt.id] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                      {customBenefitsBurdenFields.map((field, idx) => (
                        <div key={field.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{field.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.benefitsBurdenCharged[`custom-${idx}`] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Overheads */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs print:mb-0 print:leading-tight">Additional Overheads</h4>
                    <div className="ml-2 space-y-1 print:ml-1.5 print:space-y-0">
                      {ADDITIONAL_OVERHEADS_OPTIONS.map(opt => (
                        <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.additionalOverheadsCharged[opt.id] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                      {customAdditionalOverheadsFields.map((field, idx) => (
                        <div key={field.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{field.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.additionalOverheadsCharged[`custom-${idx}`] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Employee Costs */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1 text-xs print:mb-0 print:leading-tight">Employee Costs</h4>
                    <div className="ml-2 space-y-1 print:ml-1.5 print:space-y-0">
                      {EMPLOYEE_COSTS_OPTIONS.map(opt => (
                        <div key={opt.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{opt.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.employeeCostsCharged[opt.id] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                      {customEmployeeCosts.map((cost, idx) => (
                        <div key={cost.id} className="flex justify-between text-xs gap-2 min-w-0">
                          <span className="text-gray-600 min-w-0 truncate">{cost.label}:</span>
                          <span className="font-semibold text-primary shrink-0">
                            ${(safeCalculations.employeeCostsCharged[`custom-${idx}`] || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Division Overhead */}
                  <div className="border-t border-gray-200 pt-2 print:pt-1">
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-700 text-xs">Division Overhead</span>
                        <span className="text-xs text-gray-500 ml-1">({parseFloat(divisionOverheadPercent) || 0}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs shrink-0">${safeCalculations.divisionOverheadCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* General Company Overhead */}
                  <div>
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-700 text-xs">General Company Overhead</span>
                        <span className="text-xs text-gray-500 ml-1">({parseFloat(generalCompanyOverheadPercent) || 0}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs shrink-0">${safeCalculations.generalCompanyOverheadCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>

                  {/* Profit */}
                  <div>
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-700 text-xs">Profit</span>
                        <span className="text-xs text-gray-500 ml-1">({parseFloat(profitPercent) || 0}%)</span>
                      </div>
                      <span className="font-bold text-primary text-xs shrink-0">${safeCalculations.profitCharged.toFixed(2)}/hr</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Labor Rate */}
              <div className="bg-primary/10 rounded-lg p-4 mb-4 border-2 border-primary print:hidden">
                <h3 className="text-base font-semibold text-primary mb-2 print:text-sm print:mb-1">
                  Total Labor Rate
                </h3>
                <div className="text-3xl font-bold text-primary print:text-2xl print:leading-tight">
                  ${safeCalculations.totalLaborRate.toFixed(2)}/hr
                </div>
                <div className="text-xs text-gray-600 mt-1 print:text-[10px] print:mt-0.5">
                  Rate to charge for this employee's time
                </div>
              </div>

              {/* Step 3 Inputs — hidden when printing (values appear in breakdown above) */}
              <div className="bg-gray-50 rounded-lg p-4 print:hidden">
                <h3 className="text-sm font-semibold text-neutral mb-3">
                  Adjust Overhead & Profit
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <label className="text-gray-700 text-sm font-medium pr-3 pt-1">Division Overhead:</label>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'divisionOverhead' ? editingBrdnField.value : formatBrdnPercentForDisplay(divisionOverheadPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'divisionOverhead',
                          value: formatBrdnPercentForDisplay(divisionOverheadPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'divisionOverhead') setEditingBrdnField({ key: 'divisionOverhead', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'divisionOverhead') return
                          const before = formatBrdnPercentForDisplay(divisionOverheadPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) {
                            setDivisionOverheadPercent('')
                            if (fieldLocks['divisionOverheadPercent:brdn']?.locked || fieldLocks.divisionOverheadPercent?.locked) updateFieldLockValue('divisionOverheadPercent:brdn', '')
                          } else {
                            const nv = Math.round(v * 100) / 100
                            setDivisionOverheadPercent(nv)
                            if (fieldLocks['divisionOverheadPercent:brdn']?.locked || fieldLocks.divisionOverheadPercent?.locked) updateFieldLockValue('divisionOverheadPercent:brdn', nv)
                          }
                          setEditingBrdnField(null)
                        }}
                        className="w-[68px] px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs w-6">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <label className="text-gray-700 text-sm font-medium pr-3 pt-1">General Company Overhead:</label>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'generalOverhead' ? editingBrdnField.value : formatBrdnPercentForDisplay(generalCompanyOverheadPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'generalOverhead',
                          value: formatBrdnPercentForDisplay(generalCompanyOverheadPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'generalOverhead') setEditingBrdnField({ key: 'generalOverhead', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'generalOverhead') return
                          const before = formatBrdnPercentForDisplay(generalCompanyOverheadPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) {
                            setGeneralCompanyOverheadPercent('')
                            if (fieldLocks['generalCompanyOverheadPercent:brdn']?.locked || fieldLocks.generalCompanyOverheadPercent?.locked) updateFieldLockValue('generalCompanyOverheadPercent:brdn', '')
                          } else {
                            const nv = Math.round(v * 100) / 100
                            setGeneralCompanyOverheadPercent(nv)
                            if (fieldLocks['generalCompanyOverheadPercent:brdn']?.locked || fieldLocks.generalCompanyOverheadPercent?.locked) updateFieldLockValue('generalCompanyOverheadPercent:brdn', nv)
                          }
                          setEditingBrdnField(null)
                        }}
                        className="w-[68px] px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs w-6">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <label className="text-gray-700 text-sm font-medium pr-3 pt-1">Profit:</label>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingBrdnField?.key === 'profit' ? editingBrdnField.value : formatBrdnPercentForDisplay(profitPercent)}
                        onFocus={() => setEditingBrdnField({
                          key: 'profit',
                          value: formatBrdnPercentForDisplay(profitPercent)
                        })}
                        onChange={(e) => {
                          if (editingBrdnField?.key === 'profit') setEditingBrdnField({ key: 'profit', value: e.target.value })
                        }}
                        onBlur={() => {
                          if (editingBrdnField?.key !== 'profit') return
                          const before = formatBrdnPercentForDisplay(profitPercent)
                          const draft = editingBrdnField.value.trim()
                          if (draft === before || (before === '' && draft === '')) {
                            setEditingBrdnField(null)
                            return
                          }
                          const v = parseFloat(draft)
                          if (draft === '' || Number.isNaN(v)) {
                            setProfitPercent('')
                            if (fieldLocks['profitPercent:brdn']?.locked || fieldLocks.profitPercent?.locked) updateFieldLockValue('profitPercent:brdn', '')
                          } else {
                            const nv = Math.round(v * 100) / 100
                            setProfitPercent(nv)
                            if (fieldLocks['profitPercent:brdn']?.locked || fieldLocks.profitPercent?.locked) updateFieldLockValue('profitPercent:brdn', nv)
                          }
                          setEditingBrdnField(null)
                        }}
                        className="w-[68px] px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-xs w-6">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Print Button */}
              <div className="mt-4 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Print Results
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {divisionOverheadTooltipOpen && createPortal(
        <div
          role="tooltip"
          className="w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg pointer-events-none"
          style={{
            position: 'fixed',
            left: divisionOverheadTooltipPos.left,
            top: divisionOverheadTooltipPos.top - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999
          }}
        >
          <div className="font-semibold mb-1">Division Overhead includes:</div>
          <div>Management, Non-Billable and General Warehouse Space, Non-Billable Vehicles, General Overheads</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default LaborRateCalculator
