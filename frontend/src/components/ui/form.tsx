import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from 'react'
import {
  Controller,
  FormProvider,
  get,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

const FieldNameContext = createContext<string | null>(null)

function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FieldNameContext.Provider value={props.name}>
      <Controller {...props} />
    </FieldNameContext.Provider>
  )
}

function FormItem(props: ComponentProps<'div'>) {
  return <div data-slot="form-item" {...props} />
}

function FormLabel(props: ComponentProps<'label'>) {
  return (
    <label data-slot="form-label" {...props}>
      {props.children}
    </label>
  )
}

function FormControl({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function FormMessage({ className, ...props }: ComponentProps<'p'>) {
  const name = useContext(FieldNameContext)
  const { formState } = useFormContext()
  const message = name ? get(formState.errors, name)?.message : undefined

  if (!message) return null

  return (
    <p
      data-slot="form-message"
      role="alert"
      className={className}
      {...props}
    >
      {String(message)}
    </p>
  )
}

export {
  FormProvider as Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
}
