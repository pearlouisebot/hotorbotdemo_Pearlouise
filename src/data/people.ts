export type Person = {
  id: string
  name: string
  age: number
  height: string
  profession: string
  education: string
  distance: string
  clipUrl: string
  posterUrl: string
  prompt: string
  verified: true
  isSynthetic: boolean
}

const basePromptPool = [
  'my worst travel story',
  'the moment I knew I had to move here',
  'a hill I will die on',
  'my oddly specific green flag',
  'my most chaotic dinner party story',
]

const menNames = [
  'Jake','Liam','Noah','Ethan','Mason','Logan','Lucas','Aiden','Jackson','Carter',
  'Ryan','Tyler','Connor','Blake','Chase','Evan','Cole','Brody','Miles','Griffin',
  'Reid','Drew','Cal','Finn','Eli','Tanner','Jasper','Beckett','Rhett','Owen',
  'Wyatt','Hunter','Archer','Declan','Ronan','Flynn','Zach','Marcus','Adrian','Kieran'
]

const heights = [
  "5'10\"","6'0\"","6'1\"","5'11\"","6'2\"","5'9\"","6'3\"","5'10\"","6'0\"","6'1\"",
  "5'11\"","6'2\"","5'10\"","6'0\"","6'1\"","5'11\"","6'3\"","5'10\"","6'0\"","6'2\"",
  "6'1\"","5'11\"","6'0\"","5'10\"","6'2\"","6'1\"","5'11\"","6'0\"","6'3\"","5'10\"",
  "6'1\"","6'0\"","5'11\"","6'2\"","5'10\"","6'1\"","6'0\"","5'11\"","6'2\"","6'1\""
]

const professions = [
  'Software Engineer','VC-backed Founder','Product Manager','Surgeon','Investment Banker',
  'Architect','Real Estate Developer','Attorney','Entrepreneur','Venture Capitalist',
  'Startup Founder','Private Equity','Orthopedic Surgeon','Tech Lead','CFO',
  'Data Scientist','Corporate Attorney','Cardiologist','Angel Investor','Film Director',
  'Software Engineer','Founder & CEO','Product Lead','Dermatologist','Growth Lead',
  'Startup Advisor','Real Estate Investor','Biotech Founder','Brand Strategist','UX Director',
  'VC Partner','Management Consultant','Neurologist','SaaS Founder','Operations Lead',
  'Creative Director','Tech Entrepreneur','Family Medicine MD','Marketing Director','CTO'
]

const educations = [
  'Stanford MBA','Harvard Law','MIT','Wharton MBA','Cornell MD',
  'Yale','Columbia MBA','Duke','UC Berkeley','Northwestern',
  'Stanford','Harvard MBA','Georgetown Law','Dartmouth','UPenn',
  'NYU Stern','Chicago Booth','UCLA','Michigan Ross','Vanderbilt',
  'Stanford MS','Harvard MD','MIT MBA','Kellogg MBA','UCSF MD',
  'Oxford','Princeton','Emory MD','HBS','UVA Darden',
  'Cornell MBA','Notre Dame','Johns Hopkins MD','Haas MBA','Georgetown',
  'Tuck MBA','USC','Penn State MD','Ross MBA','UT Austin'
]

export const people: Person[] = menNames.map((name, index) => ({
  id: `person-${index + 1}`,
  name,
  age: 28 + (index % 10),
  height: heights[index],
  profession: professions[index],
  education: educations[index],
  distance: `${1 + (index % 9)} mi away`,
  clipUrl: `/hotorbotdemo_Pearlouise/clips/clip-${(index % 8) + 1}.mp4`,
  posterUrl: `/hotorbotdemo_Pearlouise/posters/poster-${(index % 8) + 1}.jpg`,
  prompt: basePromptPool[index % basePromptPool.length],
  verified: true,
  isSynthetic: true,
}))

export const demoUserClips = [
  {
    id: 'self-1',
    title: 'Rooftop intro',
    posterUrl: '/hotorbotdemo_Pearlouise/posters/self-1.jpg',
    clipUrl: '/hotorbotdemo_Pearlouise/clips/self-1.mp4',
    seededPickRate: 72,
  },
  {
    id: 'self-2',
    title: 'Coffee walk',
    posterUrl: '/hotorbotdemo_Pearlouise/posters/self-2.jpg',
    clipUrl: '/hotorbotdemo_Pearlouise/clips/self-2.mp4',
    seededPickRate: 43,
  },
] as const
