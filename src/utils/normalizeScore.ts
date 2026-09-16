export const normalizeScore = (grade: any, gradingMethod: string) => {
    if(grade === null || grade === undefined) {
        return 0;
    }

    switch(gradingMethod) {
        case 'percentage':
            return Number(grade);
        case 'number_grading':
            const maxGrade = 10
            return (Number(grade) / maxGrade) * 100
        case 'letter_grading':
            const letterMap: Record<string, number> = {
                'A': 100,
                'B': 85,
                'C': 70,
                'D': 55,
                'E': 50,
                'F': 40
            }
            return letterMap[String(grade).toUpperCase()] || 0;
        case 'rubric':
            const rubricMap: Record<string, number> = {
                'exceptional': 100,
                'good': 80,
                'average': 60,
                'poor': 40
            }
            return rubricMap[String(grade).toLowerCase()] || 0;
        default:
            return 0;
    }
}

export const getOriginalGradeFromPercentage = (
  percentageScore: number,
  gradingMethod: string,
  gradeScale?: { [key: string]: number }
): string => {
  switch (gradingMethod) {
    case 'percentage':
      return Math.round(percentageScore).toString();

    case 'number_grading':
      return Math.round((percentageScore / 100) * 10).toString(); 

    case 'letter_grading':
      const defaultLetterScale: { [key: string]: number } = {
        A: 100,
        B: 85,
        C: 70,
        D: 55,
        E: 50,
        F: 40
      };
      const letterScale = gradeScale || defaultLetterScale;
      let matchedLetter = 'F';
      for (const [letter, minPercentage] of Object.entries(letterScale)) {
        if (percentageScore >= minPercentage && minPercentage > (letterScale[matchedLetter] || 0)) {
          matchedLetter = letter;
        }
      }
      return matchedLetter;

    case 'rubric':
      const defaultRubricScale: { [key: string]: number } = {
        exceptional: 100,
        good: 80,
        average: 60,
        poor: 40,
        fail: 0
      };
      const rubricScale = gradeScale || defaultRubricScale;
      let matchedRubric = 'fail';
      for (const [rubric, minPercentage] of Object.entries(rubricScale)) {
        if (percentageScore >= minPercentage && minPercentage > (rubricScale[matchedRubric] || 0)) {
          matchedRubric = rubric;
        }
      }
      return matchedRubric;

    default:
      return Math.round(percentageScore).toString();
  }
};

export const getOriginalGrade = (grade: any, gradingMethod: string): number => {
    if(grade === null || grade === undefined) {
        return 0;
    }
}