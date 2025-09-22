import type { Translation } from 'primeng/api';

export const PRIMENG_EN: Partial<Translation> = {
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  dayNamesMin: ['S','M','T','W','T','F','S'],
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  today: 'Today',
  clear: 'Clear',
  chooseDate: 'Choose date',
  chooseMonth: 'Choose month',
  chooseYear: 'Choose year',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  prevYear: 'Previous year',
  nextYear: 'Next year',
  weekHeader: 'Wk',
  firstDayOfWeek: 1, 
  dateFormat: 'yy-mm-dd'
} as const;
