import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes } from 'react';
const variants=cva('button',{variants:{variant:{primary:'primary',secondary:'secondary'}},defaultVariants:{variant:'primary'}});
export function Button({variant,className,...props}:ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof variants>){return <button className={twMerge(clsx(variants({variant}),className))} {...props}/>;}
