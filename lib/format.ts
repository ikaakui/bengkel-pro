/**
 * Formats a number or string into Rupiah format with dots as thousand separators.
 * Example: 1000000 -> "1.000.000"
 */
export const formatRupiah = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === "") return "";
    
    // Remove all non-numeric characters except for formatting
    const numberString = value.toString().replace(/[^0-9]/g, "");
    if (!numberString) return "";
    
    const number = parseInt(numberString, 10);
    return number.toLocaleString("id-ID");
};

/**
 * Parses a formatted Rupiah string back to a number.
 * Example: "1.000.000" -> 1000000
 */
export const parseRupiah = (value: string | null | undefined): number => {
    if (!value) return 0;
    
    // Remove all dots and other non-numeric characters
    const cleanValue = value.toString().replace(/\./g, "").replace(/[^0-9]/g, "");
    return parseInt(cleanValue, 10) || 0;
};
