import { supabase } from '../lib/supabase';

async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: { action: 'open_app' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

async function main() {
    const rollNo = process.argv[2];
    const message = process.argv[3] || "You have a new alert!";

    if (!rollNo) {
        console.log("Usage: npx tsx scripts/send_push.ts <roll_no> \"<message>\"");
        process.exit(1);
    }

    const { data: student } = await supabase.from('students').select('push_token, name').eq('roll_no', rollNo).single();
    if (!student || !student.push_token) {
        console.log(`No valid push token found for student ${rollNo}`);
        process.exit(1);
    }

    console.log(`Sending push to ${student.name}...`);
    await sendPushNotification(student.push_token, "MVIT Coding Tracker", message);
    console.log("Sent successfully!");
}

main();
