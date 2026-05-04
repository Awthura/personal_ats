export interface GeneratedOutput {
  language: 'EN' | 'DE'
  role_title: string
  company: string
  cv_latex: string
  cl_latex?: string
  filename_cv: string
  filename_cl?: string
}
