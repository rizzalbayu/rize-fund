export function calculateRekap(rows: string[][]) {
  const now = new Date();

  const getPastDate = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  const week1 = getPastDate(7);
  const week2 = getPastDate(14);
  const week3 = getPastDate(21);
  const week4 = getPastDate(28);
  const month1 = getPastDate(30);
  const yesterday = getPastDate(1);

  let sumToday = 0;
  let sumYesterday = 0;
  let sumWeek1 = 0;
  let sumWeek2 = 0;
  let sumWeek3 = 0;
  let sumWeek4 = 0;
  let sumMonth = 0;

  for (const row of rows) {
    const nominalStr = row[1];
    const timestampStr = row[2];

    if (!nominalStr || !timestampStr) continue;

    const [dd, yy, mmmm] = timestampStr.split('/');
    const date = new Date(`${mmmm}-${yy}-${dd}`);
    const nominal = parseFloat(nominalStr);

    if (isNaN(nominal)) continue;

    if (isSameDay(date, now)) sumToday += nominal;
    if (isSameDay(date, yesterday)) sumYesterday += nominal;
    if (date >= week1) sumWeek1 += nominal;
    if (date >= week2) sumWeek2 += nominal;
    if (date >= week3) sumWeek3 += nominal;
    if (date >= week4) sumWeek4 += nominal;
    if (date >= month1) sumMonth += nominal;
  }

  return {
    today: sumToday.toLocaleString('id-ID'),
    yesterday: sumYesterday.toLocaleString('id-ID'),
    week1: sumWeek1.toLocaleString('id-ID'),
    week2: sumWeek2.toLocaleString('id-ID'),
    week3: sumWeek3.toLocaleString('id-ID'),
    week4: sumWeek4.toLocaleString('id-ID'),
    month: sumMonth.toLocaleString('id-ID'),
  };
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function calculateCategory(rows: string[][]) {
  const now = new Date();

  const getPastDate = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  console.log('test');
}
