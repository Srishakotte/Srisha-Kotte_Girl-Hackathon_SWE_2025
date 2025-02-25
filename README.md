# Srisha-Kotte_Girl-Hackathon_SWE_2025

# FINTAX - Your AI-Powered Tax Filing Companion  ([https://tax-assistant-38242.web.app/])(Try FINTAX live! )
Simplify taxes. Maximize savings. File with confidence.  

## Overview  
FINTAX is an AI-driven platform that makes tax filing accessible and efficient for all users. With features like manual data entry, intelligent tax form selection, auto-filled reports, and personalized insights, FINTAX empowers beginners and experienced filers alike. Say goodbye to tax stress and hello to smarter filing!



## Key Features  

1. Manual Tax Data Entry  
   - Input income, deductions, and investments with ease.  

2. AI-Driven Tax Form Selection  
   - AI picks the right form (e.g., ITR-1, ITR-2, ITR-3) for you.  

3. Automated Tax Report Generation  
   - Download auto-filled returns as PDF (via JSPDF) or Excel.  

4. Tax History & Visual Insights  
   - Explore past filings with charts:  
     - Red: Higher tax  
     - Green: Lower tax  
     - White: Neutral  

5. AI-Powered Tax Suggestions  
   - Get tailored tips to reduce your tax liability.  

6. AI Chatbot for Tax Queries  
   - Instant answers, powered by Google AI (Gemini).  

7. Secure Data Storage  
   - Encrypted storage with Firebase Auth access.  

---

## Workflow  
1. Enter financial details manually.  
2. AI analyzes data and selects/fills your tax form.  
3. Download your completed report.  
4. View tax history and AI suggestions via charts.  
5. Chat with the AI bot for support.  

---

## Tech Stack  
- Frontend: ReactJS, Tailwind CSS  
- Backend: Node.js, Express.js  
- Database: Google Firestore  
- AI/ML: Gemini AI  
- Visualization: Google Charts API  
- File Generation: JSPDF (PDF)  
- Authentication: Firebase Auth  

---

## Getting Started  

### Prerequisites  
- Node.js (v16+)  
- NPM or Yarn  
- Google Cloud account  

### Installation  
1. Clone the Repository  
   ```bash  
   git clone https://github.com/Srishakotte/Srisha-Kotte_Girl-Hackathon_SWE_2025.git  
   cd .\Srisha-Kotte_Girl-Hackathon_SWE_2025\
   cd .\frontend\
   ```  
   ```bash  
   npm install  
  npm install react-google-charts  
   npm install react react-dom react-router-dom firebase @google/generative-ai jspdf jspdf-autotable  

   ```  
Tailwind CSS (Optional)

```bash

npm install -D tailwindcss postcss autoprefixer  
npx tailwindcss init -p
```

3. Set Up Environment Variables  
   Create a .env file:  
   ```plaintext  
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key  
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain  
   REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id  
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket  
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id  
   REACT_APP_FIREBASE_APP_ID=your_firebase_app_id  
   REACT_APP_GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key  
   ```  

4. Run the Application  
   ```bash  
   npm start  
   ```  
   Open http://localhost:3000 to start!  

---

## How to Use  
1. Sign in with Firebase Auth.  
2. Enter your financial details.  
3. Let AI generate your tax form.  
4. Download your report.  
5. Check tax history and get suggestions.  
6. Use the chatbot for help.  

---

## Deployed Link  
Try FINTAX live!  
[(https://tax-assistant-38242.web.app/)]([https://tax-assistant-38242.web.app/]) 

---

## Testing  

- Unit tests for core features (e.g., form selection).  
- End-to-end tests for the user journey.  
- Tools: Jest, Cypress (to be implemented).  

---

## Future Enhancements  

1. Document Upload & OCR Integration  
   - Upload documents (e.g., Form 16).  
   - Extract data with Google Document AI (OCR).  
   - Store securely in Firestore with user permissions.  

2. Government Portal Integration  
   - Auto-fetch data via PAN/Aadhaar.  
   - Submit returns directly online.  

3. Fraud Detection  
   - AI flags errors or anomalies in filings.  

4. End-to-End Automation  
   - Fully automate filing from start to finish.  

5. Beginner-Friendly UI  
   - Guided steps and intuitive design.  

6. Multi-Language Support  
   - Regional language options.  



## Current Progress  
- MVP Ready: Manual entry, AI form selection, reports, visualizations, and chatbot.  
- Next: Document upload, government integration, and testing.  



## Contributing  
1. Fork the repo.  
2. Create a branch (git checkout -b feature/new-feature).  
3. Commit (git commit -m "Add feature").  
4. Push (git push origin feature/new-feature).  
5. Open a Pull Request.  





