export const SECURITY_QUESTIONS = [
  { id: 'birth_city', question: 'What city were you born in?' },
  { id: 'first_school', question: 'What was the name of your first school?' },
  { id: 'childhood_friend', question: 'What is the first name of a childhood friend?' },
  { id: 'favorite_food', question: 'What is your favorite food?' },
  { id: 'mother_middle', question: 'What is your mother\'s middle name?' },
] as const

export type SecurityQuestionId = typeof SECURITY_QUESTIONS[number]['id']
