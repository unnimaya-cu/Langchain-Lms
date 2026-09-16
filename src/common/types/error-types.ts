type TError =
  | 'invalidId'
  | 'validationError'
  | 'notFound'
  | 'duplicateKey'
  | 'unknown'
  | 'Unauthorized'


export type TErrorSection = {
  [key in TError]?: string;
};
