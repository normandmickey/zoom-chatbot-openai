export function formatDate(date) {
 if (!(date instanceof Date)) {
  throw new Error('Invalid "date" argument. You must pass a DATE instance');
 }

 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, "0");
 const day = String(date.getDate()).padStart(2, "0");
 const minutes = String(date.getMinutes()).padStart(2, "0");

 return `${year}-${month}-${day}:${minutes}`;
}

export function generateThreadId(userJid) {
 const formattedDate = formatDate(new Date());
 return `${userJid}${formattedDate}`;
}

export default {
 formatDate,
 generateThreadId,
};
