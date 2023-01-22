import dayjs from "dayjs";

export function generateDatesFromYearBeginning() {
  const firstDayOfTheYear = dayjs().startOf('year');
  const today = new Date();

  const dates = [];
  let comparetDate = firstDayOfTheYear;

  while(comparetDate.isBefore(today)){
    dates.push(comparetDate.toDate())
    comparetDate = comparetDate.add(1, 'day');
  }

  return dates;
}