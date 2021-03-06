export interface ButtonProps {
  className?: string,
  onClick?: ()=> void,
  loading?: boolean,
  disabled?: boolean,
  icon?: string,
  title?: string,
}

export type CssStyle = Record<string, number | string>