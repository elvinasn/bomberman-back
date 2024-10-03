import { DatabaseCollection } from './database_collection';
import { DatabaseSubcollection } from './database_subcollection';
import { QueryConstraint } from './query_constraint';
import { Serializable } from './serializable';

export abstract class Database {
  abstract getFieldValueDelete(): any;
  abstract getFieldValueIncrement(number: number): any;
  abstract getFieldValueArrayUnion(elements: any[]): any;
  abstract getFieldValueArrayRemove(elements: any[]): any;
  protected abstract isDatabaseField(value: any): boolean;
  protected abstract geopoint(latitude: number, longitude: number): any;
  abstract timestamp(date: Date): any;
  protected abstract unpackValue(value: any): any;

  public packMap(data: { [k: string]: any }) {
    const newData: { [k: string]: any } = {};
    for (const key in data) {
      const value = data[key];
      if (value !== undefined) newData[key] = this.packValue(value);
    }
    return newData;
  }

  protected packValue(value: any): any {
    if (typeof value === 'object') {
      if (value === null) {
        return null;
      } else if (Array.isArray(value)) {
        return value.map((val) => this.packValue(val));
      } else if (
        'latitude' in value &&
        'longitude' in value &&
        Object.keys(value).length === 2
      ) {
        return this.geopoint(value.latitude, value.longitude);
      } else if (value instanceof Date) {
        return this.timestamp(value);
      } else {
        if (this.isDatabaseField(value)) return value;
        return this.packMap(value);
      }
    } else {
      return value;
    }
  }

  public unpackMap(data: any) {
    const newData: { [k: string]: any } = {};
    for (const key in data) {
      newData[key] = this.unpackValue(data[key]);
    }
    return newData;
  }

  abstract createDocument(
    data: { [k: string]: any },
    collection: DatabaseCollection,
    documentId?: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ): Promise<string | undefined>;

  abstract setDocument(
    data: { [k: string]: any },
    collection: DatabaseCollection,
    documentId: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ): Promise<string | undefined>;

  abstract getDocument<T extends Serializable<T>>(
    object: T,
    collection: DatabaseCollection,
    documentId: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ): Promise<T | undefined>;

  abstract updateDocument(
    data: { [k: string]: any },
    collection: DatabaseCollection,
    documentId: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
    options?: {
      validateIfExists?: boolean;
      retryCount?: number;
      waitMs?: number;
    },
  ): Promise<boolean>;

  abstract deleteDocument(
    collection: DatabaseCollection,
    documentId: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ): Promise<boolean>;

  abstract getDocuments<T extends Serializable<T>>(
    object: T,
    collection: DatabaseCollection,
    queryConstraints: QueryConstraint[],
    documentId?: string,
    subcollection?: DatabaseSubcollection,
  ): Promise<T[]>;

  abstract getCollectionGroupDocuments<T extends Serializable<T>>(
    object: T,
    subcollection: DatabaseSubcollection,
    queryConstraints: QueryConstraint[],
  ): Promise<T[]>;
}
