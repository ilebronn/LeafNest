const fs = require('fs');
const path = require('path');

/**
 * Script to automatically update imports after reorganization
 * Usage: node update-imports.js
 */

// Import mapping rules
const IMPORT_RULES = [
  // Screens - Auth
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/LoginScreen['"]/g,
    replacement: "from '@screens/Auth'",
    named: 'LoginScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/SignInScreen['"]/g,
    replacement: "from '@screens/Auth'",
    named: 'SignInScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/SignUpScreen['"]/g,
    replacement: "from '@screens/Auth'",
    named: 'SignUpScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/ForgotPasswordScreen['"]/g,
    replacement: "from '@screens/Auth'",
    named: 'ForgotPasswordScreen'
  },

  // Screens - Main
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/HomeScreen['"]/g,
    replacement: "from '@screens/Main'",
    named: 'HomeScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/ScanScreen['"]/g,
    replacement: "from '@screens/Main'",
    named: 'ScanScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/FavoritesScreen['"]/g,
    replacement: "from '@screens/Main'",
    named: 'FavoritesScreen'
  },

  // Screens - Plant
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/PlanScreen['"]/g,
    replacement: "from '@screens/Plant'",
    named: 'PlanScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/PostDetailScreen['"]/g,
    replacement: "from '@screens/Plant'",
    named: 'PostDetailScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/SpeciesGalleryScreen['"]/g,
    replacement: "from '@screens/Plant'",
    named: 'SpeciesGalleryScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/SpeciesLandingPage['"]/g,
    replacement: "from '@screens/Plant'",
    named: 'SpeciesLandingPage'
  },

  // Screens - User
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/ProfileScreen['"]/g,
    replacement: "from '@screens/User'",
    named: 'ProfileScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/SettingsScreen['"]/g,
    replacement: "from '@screens/User'",
    named: 'SettingsScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/HistoryScreen['"]/g,
    replacement: "from '@screens/User'",
    named: 'HistoryScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/NotificationScreen['"]/g,
    replacement: "from '@screens/User'",
    named: 'NotificationScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/ManageNotificationsScreen['"]/g,
    replacement: "from '@screens/User'",
    named: 'ManageNotificationsScreen'
  },

  // Screens - Info
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/AboutScreen['"]/g,
    replacement: "from '@screens/Info'",
    named: 'AboutScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/HelpScreen['"]/g,
    replacement: "from '@screens/Info'",
    named: 'HelpScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/FAQScreen['"]/g,
    replacement: "from '@screens/Info'",
    named: 'FAQScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/PrivacyPolicyScreen['"]/g,
    replacement: "from '@screens/Info'",
    named: 'PrivacyPolicyScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/CookiesPolicyScreen['"]/g,
    replacement: "from '@screens/Info'",
    named: 'CookiesPolicyScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/TermsOfUseScreen['"]/g,
    replacement: "from '@screens/Info'",
    named: 'TermsOfUseScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/SendFeedbackScreen['"]/g,
    replacement: "from '@screens/Info'",
    named: 'SendFeedbackScreen'
  },

  // Screens - Other
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/ScanStatsScreen['"]/g,
    replacement: "from '@screens/Stats'",
    named: 'ScanStatsScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/ManualPaymentScreen['"]/g,
    replacement: "from '@screens/Payment'",
    named: 'ManualPaymentScreen'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*screens\/SplashScreen['"]/g,
    replacement: "from '@screens/SplashScreen'",
    named: 'SplashScreen'
  },

  // Components
  {
    pattern: /from\s+['"](\.\.?\/)*components\/CommentsModal['"]/g,
    replacement: "from '@components/modals'",
    named: 'CommentsModal'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*components\/PremiumGate['"]/g,
    replacement: "from '@components/modals'",
    named: 'PremiumGate'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*components\/UsernameEditModal['"]/g,
    replacement: "from '@components/modals'",
    named: 'UsernameEditModal'
  },

  // Services
  {
    pattern: /from\s+['"](\.\.?\/)*notifications\/notificationService['"]/g,
    replacement: "from '@services/notifications'",
    named: 'notificationService'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*notifications\/postInteractionsService['"]/g,
    replacement: "from '@services/notifications'",
    named: 'postInteractionsService'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*firestoreService['"]/g,
    replacement: "from '@services/firebase'",
    named: 'firestoreService'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*storage\/offlineStorage['"]/g,
    replacement: "from '@services/storage'",
    named: 'offlineStorage'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*scanning\/scanStatsService['"]/g,
    replacement: "from '@services/scanning'",
    named: 'scanStatsService'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*payment\/manualPaymentService['"]/g,
    replacement: "from '@services/payment'",
    named: 'manualPaymentService'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*subscription\/subscriptionService['"]/g,
    replacement: "from '@services/subscription'",
    named: 'subscriptionService'
  },

  // Utils
  {
    pattern: /from\s+['"](\.\.?\/)*utils\/user\/userUtils['"]/g,
    replacement: "from '@utils/auth'",
    named: 'userUtils'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*utils\/guest\/guestScanUtils['"]/g,
    replacement: "from '@utils/guest'",
    named: 'guestScanUtils'
  },
  {
    pattern: /from\s+['"](\.\.?\/)*utils\/network\/networkUtils['"]/g,
    replacement: "from '@utils/network'",
    named: 'networkUtils'
  },

  // Contexts
  {
    pattern: /from\s+['"](\.\.?\/)*contexts\/LanguageContext['"]/g,
    replacement: "from '@contexts'",
    named: 'LanguageContext'
  },

  // Config
  {
    pattern: /from\s+['"](\.\.?\/)*config\/firebase['"]/g,
    replacement: "from '@config/firebase'",
  },
];

// Asset path updates
const ASSET_RULES = [
  // Logos
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)logo2\.png['"]\)/g,
    replacement: "require('@assets/images/logos/logo2.png')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)PMFTCI\.png['"]\)/g,
    replacement: "require('@assets/images/logos/PMFTCI.png')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)IT\.png['"]\)/g,
    replacement: "require('@assets/images/logos/IT.png')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)icon\.png['"]\)/g,
    replacement: "require('@assets/images/logos/icon.png')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)email-logo\.png['"]\)/g,
    replacement: "require('@assets/images/logos/email-logo.png')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)google-logo\.png['"]\)/g,
    replacement: "require('@assets/images/logos/google-logo.png')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)guest-logo\.png['"]\)/g,
    replacement: "require('@assets/images/logos/guest-logo.png')"
  },

  // Backgrounds
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)background-about\.png['"]\)/g,
    replacement: "require('@assets/images/backgrounds/background-about.png')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)background-register\.jpg['"]\)/g,
    replacement: "require('@assets/images/backgrounds/background-register.jpg')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)background-result\.jpg['"]\)/g,
    replacement: "require('@assets/images/backgrounds/background-result.jpg')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)background-signin\.jpg['"]\)/g,
    replacement: "require('@assets/images/backgrounds/background-signin.jpg')"
  },
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)background\.jpg['"]\)/g,
    replacement: "require('../../../assets/background.jpg')"
  },

  // Plants
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)(aloe-vera|cactus|elephant|lion|panda|plant1|plant2|rose)\.jpg['"]\)/g,
    replacement: "require('@assets/images/plants/$2.jpg')"
  },

  // Animations
  {
    pattern: /(require\(['"](\.\.?\/)*assets\/)animated\.json['"]\)/g,
    replacement: "require('@assets/animations/animated.json')"
  },
];

// Function to update imports in a file
function updateImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];

  // Apply import rules
  IMPORT_RULES.forEach(rule => {
    const matches = content.match(rule.pattern);
    if (matches) {
      // Convert default import to named import if needed
      if (rule.named) {
        const defaultImportPattern = new RegExp(
          `import\\s+(\\w+)\\s+from\\s+['"](\\.\\.?\\/)*screens\\/${rule.named}['"]`,
          'g'
        );
        content = content.replace(defaultImportPattern, `import { ${rule.named} } ${rule.replacement}`);
      }
      
      content = content.replace(rule.pattern, rule.replacement);
      modified = true;
      changes.push(`Updated: ${rule.named || 'import'}`);
    }
  });

  // Apply asset rules
  ASSET_RULES.forEach(rule => {
    const matches = content.match(rule.pattern);
    if (matches) {
      content = content.replace(rule.pattern, rule.replacement);
      modified = true;
      changes.push('Updated asset path');
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    changes.forEach(change => console.log(`   - ${change}`));
  }

  return modified;
}

// Function to recursively process files
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and other unnecessary directories
      if (!['node_modules', '.git', 'android', 'ios', '.expo'].includes(item)) {
        processDirectory(fullPath);
      }
    } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx'))) {
      updateImportsInFile(fullPath);
    }
  });
}

// Main execution
console.log('🚀 Starting import update process...\n');

const projectRoot = process.cwd();
console.log(`📂 Project root: ${projectRoot}\n`);

// Process src directory
const srcPath = path.join(projectRoot, 'src');
if (fs.existsSync(srcPath)) {
  console.log('Processing src/ directory...\n');
  processDirectory(srcPath);
} else {
  console.log('❌ src/ directory not found. Please create the folder structure first.\n');
  process.exit(1);
}

// Also process root-level files like App.js
const rootFiles = ['App.js', 'index.js'];
rootFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    console.log(`\nProcessing root file: ${file}`);
    updateImportsInFile(filePath);
  }
});

console.log('\n✨ Import update process complete!');
console.log('\n⚠️  Important next steps:');
console.log('1. Review the changes in your files');
console.log('2. Test your app thoroughly');
console.log('3. Clear Metro bundler cache: npm start -- --reset-cache');
console.log('4. Fix any remaining import errors manually\n');