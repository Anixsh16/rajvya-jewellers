import {Slot} from '@radix-ui/react-slot';
import {cva,type VariantProps} from 'class-variance-authority';
import {clsx} from 'clsx';
const variants=cva('button',{variants:{variant:{default:'primary',outline:'secondary',ghost:'ghost'}},defaultVariants:{variant:'default'}});
export function Button({asChild=false,variant,className,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof variants>&{asChild?:boolean}){const C=asChild?Slot:'button';return <C className={clsx(variants({variant}),className)} {...props}/>;}
