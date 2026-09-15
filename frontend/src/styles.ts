// Shared Tailwind class names, so buttons, inputs and cards look the same on every page.

const buttonBase =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50'

const buttonVariants = {
  primary: 'border-blue-700 bg-blue-700 text-white hover:border-blue-800 hover:bg-blue-800',
  secondary: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  selected: 'border-blue-700 bg-blue-50 text-blue-800 hover:bg-blue-100',
  danger: 'border-red-200 bg-white text-red-700 hover:bg-red-50',
}

const buttonSizes = {
  md: 'px-4 py-2',
  sm: 'px-3 py-1.5',
}

export function buttonClass(variant: keyof typeof buttonVariants = 'primary', size: keyof typeof buttonSizes = 'md') {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]}`
}

export const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 focus:outline-none'

export const labelClass = 'block text-sm font-medium text-slate-800'

export const cardClass = 'rounded-lg border border-slate-200 bg-white shadow-sm'

export const textLinkClass =
  'rounded font-medium text-blue-700 hover:text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
