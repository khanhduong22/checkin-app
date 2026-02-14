"use client";

import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Transition } from '@headlessui/react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Fragment, useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface HeadlessComboboxProps<T> {
    items: T[];
    value: any; // The selected value (e.g., ID or string enum)
    onChange: (value: any) => void;
    
    // Function to extract the unique value to store/compare (e.g. item.id)
    valueKey?: keyof T | ((item: T) => string | number);
    
    // Function to extract the display text for the input and search (e.g. item.name)
    displayKey?: keyof T | ((item: T) => string);
    
    placeholder?: string;
    className?: string;
    
    // Optional custom option renderer
    renderOption?: (item: T, selected: boolean, active: boolean) => React.ReactNode;
}

export function HeadlessCombobox<T>({
    items,
    value,
    onChange,
    valueKey = 'value' as any,
    displayKey = 'label' as any,
    placeholder = "Select...",
    className,
    renderOption
}: HeadlessComboboxProps<T>) {
    const [query, setQuery] = useState('')

    // Helper to get actual value from item
    const getValue = useCallback((item: T) => {
        if (typeof valueKey === 'function') return valueKey(item);
        return item[valueKey];
    }, [valueKey]);

    // Helper to get display label from item
    const getDisplay = useCallback((item: T) => {
        if (!item) return '';
        if (typeof displayKey === 'function') return displayKey(item);
        return String(item[displayKey]);
    }, [displayKey]);

    // Find selected item object based on value prop
    const selectedItem = useMemo(() => {
        return items.find(item => getValue(item) === value) || null;
    }, [items, value, getValue]);

    const filteredItems = query === ''
        ? items
        : items.filter((item) =>
            getDisplay(item)
                .toLowerCase()
                .replace(/\s+/g, '')
                .includes(query.toLowerCase().replace(/\s+/g, ''))
        )

    return (
        <div className={cn("relative w-full", className)}>
            <Combobox value={selectedItem} onChange={(item) => onChange(item ? getValue(item) : null)}>
                <div className="relative mt-1">
                    <div className="relative w-full cursor-default overflow-hidden rounded-md border border-input bg-background text-left shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:text-sm">
                        <ComboboxInput
                            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-foreground bg-transparent focus:ring-0 outline-none placeholder:text-muted-foreground"
                            displayValue={(item: any) => item ? getDisplay(item) : ''}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={placeholder}
                        />
                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronsUpDown
                                className="h-4 w-4 text-muted-foreground opacity-50 hover:opacity-100"
                                aria-hidden="true"
                            />
                        </ComboboxButton>
                    </div>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery('')}
                    >
                        <ComboboxOptions className="absolute mt-1 max-h-60 min-w-full overflow-auto rounded-md bg-popover py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                            {filteredItems.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none px-4 py-2 text-muted-foreground">
                                    Nothing found.
                                </div>
                            ) : (
                                filteredItems.map((item, index) => {
                                    const itemVal = getValue(item);
                                    return (
                                        <ComboboxOption
                                            key={`${itemVal}-${index}`}
                                            className={({ active }) =>
                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                    active ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                                                }`
                                            }
                                            value={item}
                                        >
                                            {({ selected, active }) => (
                                                <>
                                                    <span
                                                        className={`block truncate ${
                                                            selected ? 'font-medium' : 'font-normal'
                                                        }`}
                                                    >
                                                        {renderOption ? renderOption(item, selected, active) : getDisplay(item)}
                                                    </span>
                                                    {selected ? (
                                                        <span
                                                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                                active ? 'text-accent-foreground' : 'text-primary'
                                                            }`}
                                                        >
                                                            <Check className="h-4 w-4" aria-hidden="true" />
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                        </ComboboxOption>
                                    )
                                })
                            )}
                        </ComboboxOptions>
                    </Transition>
                </div>
            </Combobox>
        </div>
    )
}
