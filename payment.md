Display Name: ""
Email: "@gmail.com"
Created: November 19, 2025

Now you need to create a subscription subcollection for this user.

Next Steps: Create Subscription Subcollection

Click "+ Start collection" button (you can see it at the top of the right panel)
Enter Collection ID:

Type: subscription
Click "Next"


Add the first document with these fields:
Document ID: Leave it as "Auto-ID" or type any ID like premium_sub_1
Then add these fields one by one by clicking "+ Add field":

Field 1:

   Field name: isPremium
   Type: boolean
   Value: true
Field 2:
   Field name: premiumType
   Type: string
   Value: monthly
Field 3:
   Field name: status
   Type: string
   Value: active
Field 4:
   Field name: startDate
   Type: timestamp
   Value: November 19, 2025, 12:00:00 AM (or current time)
Field 5:
   Field name: endDate
   Type: timestamp
   Value: December 19, 2025, 12:00:00 AM (one month from now)

Click "Save" button


Visual Guide:
Click here ↓
[+ Start collection] button

Then:
1. Collection ID: subscription
2. Click "Next"
3. Add all 5 fields above
4. Click "Save"



Final Step: Update Payment Submission Status
Now go back and approve the payment submission:

Click on "paymentSubmissions" in the left panel (or use the breadcrumb at top)
Find the document: ATJDANhFbOnJri8uKQwn
Edit these fields:

Change status from "pending" to "approved"
Add field verifiedAt (timestamp) = current time
Add field verifiedBy (string) = your admin email

How to edit the status field:

Click on the status field where it says "pending"
Change the value to "approved"
Press Enter or click outside

Then add the two new fields (verifiedAt and verifiedBy) by clicking "+ Add field"