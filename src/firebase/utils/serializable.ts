import { DatabaseCollection } from './database_collection';
import { DatabaseSubcollection } from './database_subcollection';

export interface PreviewFieldData {
  fields: string[];
  collection: DatabaseCollection;
  subcollection?: DatabaseSubcollection;
  parentFieldName?: string;
  readOnlyFields?: string[];
}

export abstract class Serializable<T> {
  /** Firestore document ID */
  id: string | undefined;

  protected abstract create(data?: any): T;

  previewFieldData(): PreviewFieldData {
    return {
      fields: [],
      collection: DatabaseCollection.missing,
    };
  }

  protected deserializeValue(
    value: any,
    specialType?: 'database' | 'full',
  ): any {
    if (value instanceof Serializable) {
      const data: { [k: string]: any } = {};
      for (const [k, v] of Object.entries(value)) {
        if (specialType === 'database' && k === 'id') continue;
        const deserialized = this.deserializeValue(v, specialType);
        if (typeof deserialized !== 'undefined') {
          data[k] = deserialized;
        }
      }
      return data;
    } else if (value instanceof Date) {
      if (specialType === 'full') return value.getTime();
      return value;
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((v) => this.deserializeValue(v, specialType));
      } else if (value === null) {
        return null;
      } else {
        const data: { [k: string]: any } = {};
        for (const [k, v] of Object.entries(value)) {
          const deserialized = this.deserializeValue(v, specialType);
          if (typeof deserialized !== 'undefined') {
            data[k] = deserialized;
          }
        }
        return data;
      }
    } else {
      return value;
    }
  }

  toJson<T extends Serializable<T>>(this: T) {
    return this.deserializeValue(this);
  }

  /**
   * Convert class to JSON document for Firestore
   * @returns JSON
   */
  toDatabaseObj<T extends Serializable<T>>(this: T) {
    return this.deserializeValue(this, 'database');
  }

  toFullJson<T extends Serializable<T>>(this: T) {
    return this.deserializeValue(this, 'full');
  }

  protected serializeValue(
    value: any,
    initialValue: any,
    objectInitialValue?: any,
  ): any {
    if (initialValue instanceof Serializable) {
      /// Handle Serializable content
      return initialValue.fromJson(value);
    } else if (initialValue instanceof Date) {
      /// Handle Date objects
      /// Can expand validator
      return value ? new Date(value) : new Date();
    } else if (typeof initialValue === 'object') {
      /// Handle complex objects serialization
      if (Array.isArray(initialValue)) {
        /// Handle arrays
        if (Array.isArray(value)) {
          const serializableValue =
            typeof objectInitialValue !== 'undefined'
              ? objectInitialValue
              : initialValue.length
                ? initialValue[0]
                : undefined;
          return typeof serializableValue !== 'undefined'
            ? value.map((v: any) => this.serializeValue(v, serializableValue))
            : value;
        }
        return [];
      } else if (initialValue === null) {
        /// Handle nulls
        ///
        /// Check if value itself is null - no processing is needed
        if (value === null) return null;
        /// Check if we have reference and process it
        if (typeof objectInitialValue !== 'undefined')
          return this.serializeValue(value, objectInitialValue);
        /// This is DANGEROUS, because we assign value, but there can be a missmatch
        return value;
      } else {
        /// Handle map objects
        if (
          typeof value === 'object' &&
          !Array.isArray(value) &&
          value !== null
        ) {
          const serializableValue =
            typeof objectInitialValue !== 'undefined'
              ? objectInitialValue
              : Object.keys(initialValue).length
                ? initialValue
                : undefined;
          if (typeof serializableValue !== 'undefined') {
            const data: { [k: string]: any } = {};
            for (const [k, v] of Object.entries(value)) {
              data[k] = this.serializeValue(v, objectInitialValue);
            }
            return data;
          }
          return value;
        } else {
          return {};
        }
      }
    } else {
      return value;
    }
  }

  fromJson<T extends Serializable<T>>(this: T, data?: { [k: string]: any }) {
    const newData: { [k: string]: any } = {};
    const originalEntries = Object.entries(this.create());
    for (const [key, value] of Object.entries(data ?? {})) {
      const initialEntry = originalEntries.find(([k]) => k === key);
      if (initialEntry) {
        const initialValue = initialEntry[1];
        const serializedValue = this.serializeValue(
          value,
          initialValue,
          typeof initialValue === 'object'
            ? this.processObjectField()
            : undefined,
        );
        if (typeof serializedValue !== 'undefined') {
          newData[key] = serializedValue;
        }
      }
    }
    return this.create(newData);
  }

  validateFields(excludeFields: string[] = []) {
    const excludeSet = new Set(excludeFields);
    const validationErrors: string[] = [];
    const originalEntries = Object.entries(this.create() as any);
    for (const [key, value] of Object.entries(this)) {
      if (excludeSet.has(key)) continue;
      const initialEntry = originalEntries.find(([k]) => k === key);
      if (!initialEntry) continue;
      const initialValue = initialEntry[1];

      if (typeof initialValue === 'object') {
        const objectField = this.processObjectField();
        if (
          typeof value !== typeof initialValue &&
          typeof value !== typeof objectField
        ) {
          validationErrors.push(
            `${key} value (${value}) should be ${typeof initialValue} or ${typeof objectField})`,
          );
          continue;
        }
      } else if (typeof initialValue !== typeof value) {
        validationErrors.push(
          `${key} typeof (${typeof value}) should be ${typeof initialValue})`,
        );
        continue;
      }

      if (value instanceof Serializable) {
        const messages = value.validateFields(excludeFields);
        if (messages.length) validationErrors.push(...messages);
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          const arrayOfMessages = value.map((v) =>
            v instanceof Serializable ? v.validateFields(excludeFields) : [],
          );
          const messages = arrayOfMessages.length
            ? arrayOfMessages.reduce((pv, cv) => [...pv, ...cv])
            : [];
          if (messages.length) validationErrors.push(...messages);
        } else if (value === null) {
          const message = this.validateField();
          if (message) validationErrors.push(message);
        } else {
          const arrayOfMessages = Object.values(value).map((v) =>
            v instanceof Serializable ? v.validateFields(excludeFields) : [],
          );
          const messages = arrayOfMessages.length
            ? arrayOfMessages.reduce((pv, cv) => [...pv, ...cv])
            : [];
          if (messages.length) validationErrors.push(...messages);
        }
      } else {
        const message = this.validateField();
        if (message) validationErrors.push(message);
      }
    }
    return validationErrors;
  }

  protected validateLanguageField(key: string, value: { [k: string]: string }) {
    const keys = new Set(Object.keys(value));
    const missingLangs: string[] = [];
    this.languageCodes().forEach((lang) => {
      if (!keys.has(lang)) {
        missingLangs.push(lang);
      }
    });
    if (missingLangs.length)
      return `${key} is missing languages ${missingLangs}`;
    return '';
  }

  protected validateImageField(key: string, value: string) {
    const splitLine = value.split('.');
    const extension = splitLine[splitLine.length - 1];
    if (!['jpg', 'jpeg', 'png', 'webp'].some((ext) => ext === extension))
      return `${key} (${value}) is not supported type. It should be jpeg, png or webp`;
    return '';
  }

  protected validateField() {
    return '';
  }

  languageFields(): string[] {
    return [];
  }

  protected blockedFields(): string[] {
    return [];
  }

  protected languageCodes(): string[] {
    return ['lt', 'en'];
  }

  processObjectField(): any {
    return undefined;
  }

  protected processNullableField() {
    return null;
  }

  toImportFileKeys<T extends Serializable<T>>(this: T) {
    const keys = new Set<string>();
    for (const [key, value] of Object.entries(this)) {
      if (key === 'id') continue; // [Do not create id keys]
      if (this.blockedFields().some((field) => field === key)) {
        continue; // [Skip blocked import fields]
      } else if (this.languageFields().some((field) => field === key)) {
        this.languageCodes().forEach((lang) => keys.add(`${key}.${lang}`));
      } else if (value instanceof Serializable) {
        const subKeys = value.toImportFileKeys();
        for (const subKey of subKeys) {
          keys.add(`${key}.${subKey}`);
        }
      } else if (value !== 'undefined') {
        if (typeof value === 'object') {
          if (Array.isArray(value) || value === null) {
            keys.add(key);
          } else {
            Object.keys(value).forEach((subKey) => {
              keys.add(`${key}.${subKey}`);
            });
          }
        } else {
          keys.add(key);
        }
      }
    }
    return keys;
  }

  toViewEntries<T extends Serializable<T>>(this: T) {
    const keys: [string, any][] = [];
    for (const [key, value] of Object.entries(this)) {
      if (this.blockedFields().some((field) => field === key)) {
        continue; // [Skip blocked fields]
      } else if (value !== 'undefined') {
        keys.push([key, value]);
      }
    }
    return keys;
  }
}
