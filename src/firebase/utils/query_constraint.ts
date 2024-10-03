export type QueryConstraint =
  | WhereConstraint
  | OrderByConstraint
  | LimitConstraint
  | OffsetConstraint
  | StartAfterConstraint
  | EndAtConstraint
  | OrConstraint;

export interface WhereConstraint {
  type: 'where';
  field: string;
  operator:
    | '<'
    | '<='
    | '=='
    | '!='
    | '>='
    | '>'
    | 'array-contains'
    | 'in'
    | 'array-contains-any'
    | 'not-in';
  value: unknown;
}

interface OrderByConstraint {
  type: 'orderBy';
  field: string;
  direction: 'desc' | 'asc';
}

interface LimitConstraint {
  type: 'limit';
  limit: number;
}

interface OffsetConstraint {
  type: 'offset';
  offset: number;
}

interface StartAfterConstraint {
  type: 'startAfter';
  id: string;
}

interface EndAtConstraint {
  type: 'endBefore';
  id: string;
}

interface OrConstraint {
  type: 'or';
  constraints: WhereConstraint[];
}
