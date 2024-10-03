import * as firestore from 'firebase-admin/firestore';
import { DatabaseCollection } from './utils/database_collection';
import { DatabaseSubcollection } from './utils/database_subcollection';
import { Serializable } from './utils/serializable';
import { QueryConstraint } from './utils/query_constraint';
import { Database } from './utils/abstract_database';
import { Injectable } from '@nestjs/common';

import * as admin from 'firebase-admin';

export enum ChangeType {
  CREATE,
  DELETE,
  UPDATE,
  IMPORT,
}

@Injectable()
export class FirebaseService extends Database {
  private firestore: firestore.Firestore;

  constructor() {
    super();
    // Initialize Firebase Admin SDK
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(
          './src/firebase/service_account.json',
        ),
      });
    }

    this.firestore = admin.firestore();
  }

  getFieldValueDelete() {
    return firestore.FieldValue.delete();
  }

  getFieldValueIncrement(number: number) {
    return firestore.FieldValue.increment(number);
  }

  getFieldValueArrayUnion(...elements: any[]) {
    return firestore.FieldValue.arrayUnion(
      ...elements.map((e) => this.packValue(e)),
    );
  }
  getFieldValueArrayRemove(...elements: any[]) {
    return firestore.FieldValue.arrayRemove(
      ...elements.map((e) => this.packValue(e)),
    );
  }
  protected isDatabaseField(value: any): boolean {
    return value instanceof firestore.FieldValue;
  }
  protected geopoint(latitude: number, longitude: number) {
    return new firestore.GeoPoint(latitude, longitude);
  }
  timestamp(date: Date) {
    return firestore.Timestamp.fromDate(date);
  }
  protected unpackValue(value: any): any {
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((val) => this.unpackValue(val));
      } else if (value instanceof firestore.Timestamp) {
        return value.toDate();
      } else if (value === null) {
        return null;
      } else {
        return this.unpackMap(value);
      }
    } else {
      return value;
    }
  }

  protected docToType<T extends Serializable<T>>(
    type: T,
    doc: firestore.DocumentSnapshot,
  ) {
    const data = doc.data();
    if (data) {
      data.id = doc.id;
      const unpacked = this.unpackMap(data);
      const object = type.fromJson(unpacked);
      return object;
    }
    return undefined;
  }

  async getDocumentRef(
    collection: DatabaseCollection,
    documentId?: string,
  ): Promise<firestore.DocumentReference | undefined> {
    try {
      if (documentId) {
        return this.firestore.collection(collection).doc(documentId);
      }
      return this.firestore.collection(collection).doc();
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] createDocument: 
            collection: ${collection},
            documentId: ${documentId},
          `),
        e,
      );
      return undefined;
    }
  }

  /**
   * Create or Rewrite Firestore document.
   * @param data json data
   * @param collection collection name
   * @param documentId document ID
   * @param subcollection (optional) - sub collection
   * @param subdocumentId (optional) (required if 'subcollection' provided) - sub collection doc ID
   * @returns Promise<boolean> - status response
   */
  async createDocument(
    data: { [k: string]: any },
    collection: DatabaseCollection,
    documentId?: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ) {
    try {
      data.dateCreated = new Date(); // [Assign date create value]

      const json = this.packMap(data);
      let id = documentId;
      let collectionRef = this.firestore.collection(collection);
      if (subcollection && documentId) {
        id = subdocumentId;
        collectionRef = collectionRef
          .doc(documentId)
          .collection(subcollection.toString());
      }
      if (id) {
        return collectionRef
          .doc(id)
          .set(json)
          .then(() => id);
      } else {
        return collectionRef.add(json).then((doc) => doc.id);
      }
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] createDocument: 
            data: ${JSON.stringify(data)},
            collection: ${collection},
            documentId: ${documentId},
            subcollection: ${subcollection},
            subdocumentId: ${subdocumentId}
          `),
        e,
      );
      return undefined;
    }
  }

  /**
   * Create or Update Firestore document.
   * @param data json data
   * @param collection collection name
   * @param documentId document ID
   * @param subcollection (optional) - sub collection
   * @param subdocumentId (optional) (required if 'subcollection' provided) - sub collection doc ID
   * @returns serialized <T>
   */
  async setDocument(
    data: { [k: string]: any },
    collection: DatabaseCollection,
    documentId: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ) {
    try {
      data.dateModified = new Date(); // [Assign date mod value]

      const json = this.packMap(data);
      let id = documentId;
      let collectionRef = this.firestore.collection(collection);
      if (subcollection && documentId && subdocumentId) {
        id = subdocumentId;
        collectionRef = collectionRef
          .doc(documentId)
          .collection(subcollection.toString());
      }

      return collectionRef
        .doc(id)
        .set(json, { merge: true })
        .then(() => id);
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] createDocument: 
            data: ${data},
            collection: ${collection},
            documentId: ${documentId},
            subcollection: ${subcollection},
            subdocumentId: ${subdocumentId}
          `),
        e,
      );
      return undefined;
    }
  }

  async getDocument<T extends Serializable<T>>(
    object: T,
    collection: DatabaseCollection,
    documentId: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ) {
    try {
      let id = documentId;
      let collectionRef = this.firestore.collection(collection);
      if (subcollection && subdocumentId) {
        id = subdocumentId;
        collectionRef = collectionRef
          .doc(documentId)
          .collection(subcollection.toString());
      }
      const docRef = collectionRef.doc(id);
      const doc = await docRef.get();
      const data = await doc.data();
      if (!data) return;
      return this.docToType(object, doc);
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] getDocument:
            collection: ${collection},
            documentId: ${documentId},
            subcollection: ${subcollection},
            subdocumentId: ${subdocumentId}
          `),
        e,
      );
      return undefined;
    }
  }

  /**
   * Update firestore document.
   * @param data json data
   * @param collection collection name
   * @param documentId document ID
   * @param subcollection (optional) - sub collection
   * @param subdocumentId (optional) (required if 'subcollection' provided) - sub collection doc ID
   * @param options (optional) by default retryCount = 3, waitMs = 500
   * @returns Promise<boolean> - status response
   */
  async updateDocument(
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
  ) {
    try {
      if (!documentId) {
        console.error(
          new Error(`documentId can not be empty string. data: ${JSON.stringify(
            data,
          )},
          collection: ${collection},
          documentId: ${documentId},
          subcollection: ${subcollection},
          subdocumentId: ${subdocumentId}`),
        );
        return false;
      }
      data.dateLastRefresh = new Date(); // [Assign date last refresh value]

      const json = this.packMap(data);
      let docRef = this.firestore.collection(collection).doc(documentId);
      if (subcollection) {
        if (subdocumentId)
          docRef = docRef
            .collection(subcollection.toString())
            .doc(subdocumentId);
        else {
          console.error(
            new Error(
              `subdocumentId is mandatory. data: ${JSON.stringify(data)},
                collection: ${collection},
                documentId: ${documentId},
                subcollection: ${subcollection},
                subdocumentId: ${subdocumentId}`,
            ),
          );
          return false;
        }
      }
      if (options?.validateIfExists) {
        if ((await docRef.get()).exists) await docRef.update(json);
        else {
          console.log(`document: ${docRef.path} does not exist`);
        }
      } else await docRef.update(json);
      return true;
    } catch (e) {
      const _options = options ?? {
        retryCount: 3,
        waitMs: 500,
      };
      if (_options.retryCount && _options.retryCount > 0) {
        --_options.retryCount;
        await new Promise((r) => setTimeout(r, _options.waitMs));
        await this.updateDocument(
          data,
          collection,
          documentId,
          subcollection,
          subdocumentId,
          _options,
        );
      }
      console.error(
        new Error(`[ServerDatabase] updateDocument:
            data: ${JSON.stringify(data)},
            collection: ${collection},
            documentId: ${documentId},
            subcollection: ${subcollection},
            subdocumentId: ${subdocumentId}
          `),
        e,
      );
      return false;
    }
  }

  /**
   * Delete firestore document.
   * @param collection collection name
   * @param documentId document ID
   * @param subcollection (optional) - sub collection
   * @param subdocumentId (optional) (required if 'subcollection' provided) - sub collection doc ID
   * @returns Promise<boolean> - status response
   */
  async deleteDocument(
    collection: DatabaseCollection,
    documentId: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ) {
    try {
      let id = documentId;
      let collectionRef = this.firestore.collection(collection);
      if (subcollection && subdocumentId) {
        id = subdocumentId;
        collectionRef = collectionRef
          .doc(documentId)
          .collection(subcollection.toString());
      }
      const docRef = collectionRef.doc(id);
      await docRef.delete();
      return true;
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] deleteDocument:
              collection: ${collection},
              documentId: ${documentId},
              subcollection: ${subcollection},
              subdocumentId: ${subdocumentId}
            `),
        e,
      );
      return false;
    }
  }

  /**
   * Get typed documents from firestore.
   * @param object <T> object class for serialization
   * @param collection collection name
   * @param queryConstraints query constraints, may be an empty array
   * @param documentId (optional) document ID to scope subcollection, in this case provide 'subcollection' name
   * @param subcollection (optional) (required if 'documentId' provided) subcollection name
   * @returns Promise<T[]>
   */
  async getDocuments<T extends Serializable<T>>(
    object: T,
    collection: DatabaseCollection,
    queryConstraints: QueryConstraint[],
    documentId?: string,
    subcollection?: DatabaseSubcollection,
  ) {
    try {
      let collectionRef = this.firestore.collection(collection);
      if (documentId && subcollection) {
        collectionRef = collectionRef
          .doc(documentId)
          .collection(subcollection.toString());
      }
      let query: firestore.Query | undefined;
      for (const value of queryConstraints) {
        if (value.type === 'limit') {
          query = (query ?? collectionRef).limit(value.limit);
        } else if (value.type === 'offset') {
          query = (query ?? collectionRef).offset(value.offset);
        } else if (value.type === 'orderBy') {
          query = (query ?? collectionRef).orderBy(
            value.field,
            value.direction,
          );
        } else if (value.type === 'where') {
          query = (query ?? collectionRef).where(
            value.field,
            value.operator,
            value.value,
          );
        } else if (value.type === 'startAfter') {
          const snap = await this.firestore
            .collection(collection)
            .doc(value.id)
            .get();
          query = (query ?? collectionRef).startAfter(snap);
        } else if (value.type === 'endBefore') {
          const snap = await this.firestore
            .collection(collection)
            .doc(value.id)
            .get();
          query = (query ?? collectionRef).endBefore(snap);
        }
      }
      const snap = query ? await query.get() : await collectionRef.get();
      return snap.docs
        .map((doc) => this.docToType(object, doc))
        .filter((doc) => doc !== undefined) as T[];
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] getDocuments:
            collection: ${collection},
            queryConstraints: ${JSON.stringify(queryConstraints)},
            documentId: ${documentId},
            subcollection: ${subcollection},
          `),
        e,
      );
      return [];
    }
  }

  /**
   * Get Collection Group documents. Allows to query directly from sub collections.
   * @param object <T> object class for serialization
   * @param subcollection collection name
   * @param queryConstraints query constraints, may be an empty array
   * @returns Promise<T[]>
   */
  async getCollectionGroupDocuments<T extends Serializable<T>>(
    object: T,
    subcollection: DatabaseSubcollection,
    queryConstraints: QueryConstraint[],
  ): Promise<T[]> {
    try {
      const collectionRef = this.firestore.collectionGroup(
        subcollection.toString(),
      );
      let query: firestore.Query | undefined;
      for (const value of queryConstraints) {
        if (value.type === 'limit') {
          query = (query ?? collectionRef).limit(value.limit);
        } else if (value.type === 'offset') {
          query = (query ?? collectionRef).offset(value.offset);
        } else if (value.type === 'orderBy') {
          query = (query ?? collectionRef).orderBy(
            value.field,
            value.direction,
          );
        } else if (value.type === 'where') {
          query = (query ?? collectionRef).where(
            value.field,
            value.operator,
            value.value,
          );
        }
      }
      const snap = query ? await query.get() : await collectionRef.get();
      return snap.docs
        .map((doc) => this.docToType(object, doc))
        .filter((doc) => doc !== undefined) as T[];
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] getCollectionGroupDocuments:
              subcollection: ${subcollection},
              queryConstraints: ${queryConstraints},
            `),
        e,
      );
      return [];
    }
  }

  /**
   * Update or Create firestore document if not exists.
   * @param data json data
   * @param collection collection name
   * @param documentId document ID
   * @param subcollection (optional) - sub collection
   * @param subdocumentId (optional) (required if 'subcollection' provided) - sub collection doc ID
   * @returns Promise<boolean> - status response
   */
  async setMergeDocument(
    data: { [k: string]: any },
    collection: DatabaseCollection,
    documentId: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ) {
    try {
      data.dateLastRefresh = new Date(); // [Assign date last refresh value]

      const json = this.packMap(data);
      let docRef = this.firestore.collection(collection).doc(documentId);
      if (subcollection && subdocumentId) {
        docRef = docRef.collection(subcollection.toString()).doc(subdocumentId);
      }
      await docRef.set(json, { merge: true });
      return true;
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] updateDocument:
            data: ${JSON.stringify(data)},
            collection: ${collection},
            documentId: ${documentId},
            subcollection: ${subcollection},
            subdocumentId: ${subdocumentId}
          `),
        e,
      );
      return false;
    }
  }

  /** Get Batch instance */
  batch() {
    return new Batch(this.firestore);
  }

  /**
   * Make firestore transaction.
   * @param collection collection name
   * @param documentId target document ID
   * @param transactionProcedure async transaction procedure
   * @returns Promise<T | null>
   */
  async transaction<T>(
    collection: DatabaseCollection,
    documentId: string,
    transactionProcedure: (
      t: firestore.Transaction,
      snap: firestore.DocumentSnapshot,
    ) => Promise<T | null>,
  ) {
    return await this.firestore
      .runTransaction(async (t) => {
        const ref = this.firestore.collection(collection).doc(documentId);
        return await t.get(ref).then(async (docSnap) => {
          return await transactionProcedure(t, docSnap).catch((e) => {
            console.error(
              new Error('Error in provided transactionProcedure() => {}'),
              e,
            );
            return null;
          });
        });
      })
      .catch((err) => {
        console.error(
          new Error(
            `Transaction failure: Collection: ${collection}; documentId: ${documentId}`,
          ),
          err,
        );
        return null;
      });
  }

  /**
   * Make firestore multi-transaction
   * @param refs_data ia array of collection/document references to track in transaction
   * @param transactionProcedure async transaction procedure
   * @param fieldMask (optional) - fields to be tracked - reduces the amount of data transmitted
   * @returns Promise<T | null>
   */
  async transactionMultiple<T>(
    refs_data: {
      collection: DatabaseCollection;
      documentId: string;
    }[],
    transactionProcedure: (
      t: firestore.Transaction,
      snaps: firestore.DocumentSnapshot[],
    ) => Promise<T | null>,
    fieldMask?: string[],
  ) {
    const refs: firestore.DocumentReference[] = [];
    for (const dat of refs_data)
      refs.push(this.firestore.collection(dat.collection).doc(dat.documentId));
    if (fieldMask && fieldMask.length)
      refs.push({ fieldMask: fieldMask } as any);

    return await this.firestore
      .runTransaction(async (t) => {
        return await t.getAll(...refs).then(async (docSnap) => {
          return await transactionProcedure(t, docSnap);
        });
      })
      .catch((err) => {
        console.error(
          new Error(`Multi-Transaction failure: ${JSON.stringify(refs_data)}`),
          err,
        );
        return null;
      });
  }

  /** Copy Firestore Document */
  async copyFirestoreDocument(
    collection: DatabaseCollection | string,
    docId: string,
    newDocId: string,
    newCollection = collection,
  ) {
    const spmePr = await this.firestore
      .collection(collection)
      .doc(docId)
      .get()
      .then((va: any) => {
        const cdoc = va.data();
        if (cdoc) {
          if (newDocId)
            return this.firestore
              .collection(newCollection)
              .doc(newDocId)
              .set(cdoc)
              .then(() => {
                return newDocId;
              });
          else
            return this.firestore
              .collection(newCollection)
              .add(cdoc)
              .then((_s) => {
                return _s.id;
              });
        }
        return null;
      });
    return { status: 'success', statusCode: 200, reason: spmePr };
  }

  /** Get Raw JSON's with nested .id */
  async getIdentifiedDocumentDataArray(
    collection: DatabaseCollection,
    queryConstraints: QueryConstraint[],
    documentId?: string,
    subcollection?: DatabaseSubcollection,
  ) {
    try {
      let collectionRef = this.firestore.collection(collection);
      if (documentId && subcollection) {
        collectionRef = collectionRef
          .doc(documentId)
          .collection(subcollection.toString());
      }
      let query: firestore.Query | undefined;
      for (const value of queryConstraints) {
        if (value.type === 'limit') {
          query = (query ?? collectionRef).limit(value.limit);
        } else if (value.type === 'offset') {
          query = (query ?? collectionRef).offset(value.offset);
        } else if (value.type === 'orderBy') {
          query = (query ?? collectionRef).orderBy(
            value.field,
            value.direction,
          );
        } else if (value.type === 'where') {
          query = (query ?? collectionRef).where(
            value.field,
            value.operator,
            value.value,
          );
        }
      }
      const snap = query ? await query.get() : await collectionRef.get();
      return snap.docs.map((doc) => {
        const data = doc.data();
        data.id = doc.id;
        return data;
      });
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] getIdentifiedDocumentDataArray:
            collection: ${collection},
            queryConstraints: ${queryConstraints},
            documentId: ${documentId},
            subcollection: ${subcollection},
          `),
        e,
      );
      return [];
    }
  }

  async getIdentifiedDocumentData(
    collection: DatabaseCollection,
    documentId: string,
    subcollection?: DatabaseSubcollection,
    subdocumentId?: string,
  ) {
    try {
      let collectionRef = this.firestore.collection(collection).doc(documentId);
      if (subcollection && subdocumentId)
        collectionRef = collectionRef
          .collection(subcollection.toString())
          .doc(subdocumentId);
      const snap = await collectionRef.get();
      const data = snap.data();
      if (data) {
        data.id = snap.id;
        return data as any;
      }
      return undefined;
    } catch (e) {
      console.error(
        new Error(`[ServerDatabase] getIdentifiedDocumentDataArray:
            collection: ${collection},
            documentId: ${documentId},
            subcollection: ${subcollection},
            subdocumentId: ${subdocumentId},
          `),
        e,
      );
      return undefined;
    }
  }

  async exportFirestore(bucketName: string) {
    const client = new firestore.v1.FirestoreAdminClient();
    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    if (projectId) {
      const databaseName = client.databasePath(projectId, '(default)');
      return client
        .exportDocuments({
          name: databaseName,
          outputUriPrefix: bucketName,
          collectionIds: [],
        })
        .then((responses) => {
          const response = responses[0];
          console.log(`Operation Name: ${response.name}`);
        })
        .catch((err) => {
          console.error(err);
          throw new Error('Export operation failed');
        });
    } else {
      throw new Error('projectId not set');
    }
  }

  /**
   * Get document class from already obtained DocumentSnapshot.
   * @param object <T> object class for serialization
   * @param snapshot already queried DocumentSnapshot
   * @returns serialized <T>
   */
  getDocumentFromSnapshot<T extends Serializable<T>>(
    object: T,
    snapshot: firestore.DocumentSnapshot,
  ) {
    try {
      return this.docToType(object, snapshot);
    } catch (e) {
      console.error(new Error(`[ServerDatabase] getDocumentFromSnapshot`), e);
      return undefined;
    }
  }
}

interface ReferenceData {
  collection: DatabaseCollection;
  documentId: string;
  subcollection?: DatabaseSubcollection;
  subdocumentId?: string;
}

export class Batch {
  private batchLimit: number = 500;
  // https://firebase.google.com/docs/firestore/manage-data/transactions
  // https://firebase.google.com/docs/firestore/quotas#security_rules
  private firestore: firestore.Firestore;
  private batch: firestore.WriteBatch | null;
  private operationCount: number = 0;

  constructor(firestore: firestore.Firestore) {
    this.firestore = firestore;
    this.batch = firestore.batch();
  }

  async create(referenceData: ReferenceData, data: any) {
    const ref = this.getDocumentRef(referenceData);
    if (ref && this.batch) this.batch.create(ref, data);
    else {
      console.error(
        new Error(
          `Batch is not initiated, failed create ${JSON.stringify(
            referenceData,
          )}`,
        ),
      );
      return;
    }
    await this.handleOperationLimit();
  }

  async set(referenceData: ReferenceData, data: any) {
    const ref = this.getDocumentRef(referenceData);
    if (ref && this.batch) this.batch.set(ref, data);
    else {
      console.error(
        new Error(
          `Batch is not initiated, failed set ${JSON.stringify(referenceData)}`,
        ),
      );
      return;
    }
    await this.handleOperationLimit();
  }

  async update(
    referenceData: ReferenceData,
    data: { [k: string]: any },
    precondition: firestore.Precondition | undefined = undefined,
  ) {
    const ref = this.getDocumentRef(referenceData);
    if (ref && this.batch) {
      if (precondition) this.batch.update(ref, data, precondition);
      else this.batch.update(ref, data);
    } else {
      console.error(
        new Error(
          `Batch is not initiated, failed update ${JSON.stringify(
            referenceData,
          )}`,
        ),
      );
      return;
    }
    await this.handleOperationLimit();
  }

  async delete(
    referenceData: ReferenceData,
    precondition: firestore.Precondition | undefined = undefined,
  ) {
    const ref = this.getDocumentRef(referenceData);
    if (ref && this.batch) {
      if (precondition) this.batch.delete(ref, precondition);
      else this.batch.delete(ref);
    } else {
      console.error(
        new Error(
          `Batch is not initiated, failed delete ${JSON.stringify(
            referenceData,
          )}`,
        ),
      );
      return;
    }
    await this.handleOperationLimit();
  }

  async commit() {
    if (this.operationCount % this.batchLimit !== 0) {
      if (this.batch) {
        await this.batch.commit();
        this.batch = null;
      }
      // [No reason to error not initiated batch commit]
    }
  }

  private async handleOperationLimit() {
    ++this.operationCount;
    if (this.operationCount % this.batchLimit === 0) {
      if (this.batch) await this.batch.commit();
      else console.error(`Batch is not initiated`);
      this.batch = this.firestore.batch();
    }
  }

  private getDocumentRef(
    referenceData: ReferenceData,
  ): firestore.DocumentReference<firestore.DocumentData> | undefined {
    try {
      let ref: firestore.DocumentReference<firestore.DocumentData> =
        this.firestore
          .collection(referenceData.collection)
          .doc(referenceData.documentId);

      if (
        referenceData.subcollection &&
        referenceData.documentId &&
        referenceData.subdocumentId
      )
        ref = ref
          .collection(referenceData.subcollection.toString())
          .doc(referenceData.subdocumentId);

      return ref;
    } catch (e) {
      console.error(
        new Error(
          `[ServerDatabase] getDocumentRef: ${JSON.stringify(referenceData)}`,
        ),
        e,
      );
      return undefined;
    }
  }
}
