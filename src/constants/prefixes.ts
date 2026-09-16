import { ModelNames } from 'src/common/enum/model-names.enum';

export const prefixes: { [key in ModelNames]?: { key: string; pad: number } } =
  {
    User: { key: 'M', pad: 4 },
    Course: { key: 'MINB', pad: 4 },
    Categorie: { key: 'MINB', pad: 4 },
    MinbarFileName: { key: 'MinbarFileName', pad: 6 },
    Question: { key: 'Min', pad: 4 },
  };
