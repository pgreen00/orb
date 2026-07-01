import { InputMaskOptions } from "../../utils/input-mask";

export const Masks = {
  PHONE: {
    formatter: (value) => {
      const digits = value.substring(0, 10);
      if (digits.length === 0) return "";
      if (digits.length <= 3) return `(${digits}`;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    },
    extractor: (val) => val.replace(/\D/g, ""),
  } satisfies Omit<InputMaskOptions, 'inputElement'>,
  MONEY: {
    formatter: (value) => {
      const digits = value;
      if (!digits) return "";
      const number = parseInt(digits, 10) / 100;
      return (
        "$" +
        number.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    },
    extractor: (val) => val.replace(/\D/g, ""),
  } satisfies Omit<InputMaskOptions, 'inputElement'>,
  NUMBER: {
    formatter: (str: string) => {
      const digits = str.replace(/\D/g, '')
      if (!digits) return ''
      return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    },
    extractor: (str: string) => str.replace(/\D/g, ''),
  } satisfies Omit<InputMaskOptions, 'inputElement'>,
  TIME: {
    formatter: (str: string) => {
      const digits = str.replace(/\D/g, '')
      if (!digits) return ''

      let formatted = ''
      if (digits.length >= 1) {
        // Hours (max 23)
        let hours = digits.substring(0, 2)
        if (parseInt(hours) > 23) hours = '23'
        formatted = hours
      }
      if (digits.length >= 3) {
        // Minutes (max 59)
        let minutes = digits.substring(2, 4)
        if (parseInt(minutes) > 59) minutes = '59'
        formatted += ':' + minutes
      }

      return formatted
    },
    extractor: (str: string) => str.replace(/\D/g, ''),
  } satisfies Omit<InputMaskOptions, 'inputElement'>,
  DATE: {
    formatter: (str: string) => {
      const digits = str.replace(/\D/g, '')
      if (!digits) return ''

      let formatted = ''
      if (digits.length >= 1) {
        // Month (max 12)
        let month = digits.substring(0, 2)
        if (parseInt(month) > 12) month = '12'
        formatted = month
      }
      if (digits.length >= 3) {
        // Day (max 31)
        let day = digits.substring(2, 4)
        if (parseInt(day) > 31) day = '31'
        formatted += '/' + day
      }
      if (digits.length >= 5) {
        // Year
        formatted += '/' + digits.substring(4, 8)
      }

      return formatted
    },
    extractor: (str: string) => str.replace(/\D/g, ''),
  } satisfies Omit<InputMaskOptions, 'inputElement'>,
  DATETIME: {
    formatter: (str: string) => {
      const digits = str.replace(/\D/g, '')
      if (!digits) return ''

      let formatted = ''
      if (digits.length >= 1) {
        let month = digits.substring(0, 2)
        if (parseInt(month) > 12) month = '12'
        formatted = month
      }
      if (digits.length >= 3) {
        let day = digits.substring(2, 4)
        if (parseInt(day) > 31) day = '31'
        formatted += '/' + day
      }
      if (digits.length >= 5) {
        formatted += '/' + digits.substring(4, 8)
      }
      if (digits.length >= 9) {
        let hours = digits.substring(8, 10)
        if (parseInt(hours) > 23) hours = '23'
        formatted += ' ' + hours
      }
      if (digits.length >= 11) {
        let minutes = digits.substring(10, 12)
        if (parseInt(minutes) > 59) minutes = '59'
        formatted += ':' + minutes
      }

      return formatted
    },
    extractor: (str: string) => str.replace(/\D/g, ''),
  } satisfies Omit<InputMaskOptions, 'inputElement'>,
  DATERANGE: {
    formatter: (str: string) => {
      const digits = str.replace(/\D/g, '')
      if (!digits) return ''

      let formatted = ''

      // Start date
      if (digits.length >= 1) {
        let month = digits.substring(0, 2)
        if (parseInt(month) > 12) month = '12'
        formatted = month
      }
      if (digits.length >= 3) {
        let day = digits.substring(2, 4)
        if (parseInt(day) > 31) day = '31'
        formatted += '/' + day
      }
      if (digits.length >= 5) {
        formatted += '/' + digits.substring(4, 8)
      }

      // Separator
      if (digits.length >= 9) {
        formatted += ' - '
      }

      // End date
      if (digits.length >= 9) {
        let month = digits.substring(8, 10)
        if (parseInt(month) > 12) month = '12'
        formatted += month
      }
      if (digits.length >= 11) {
        let day = digits.substring(10, 12)
        if (parseInt(day) > 31) day = '31'
        formatted += '/' + day
      }
      if (digits.length >= 13) {
        formatted += '/' + digits.substring(12, 16)
      }

      return formatted
    },
    extractor: (str: string) => str.replace(/\D/g, ''),
  } satisfies Omit<InputMaskOptions, 'inputElement'>,
} as const
