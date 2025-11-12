// import React from 'react';
// import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
// import { useUser, useClerk } from '@clerk/clerk-expo';
// import { Stack } from 'expo-router';

// export default function ProfileScreen() {
//   // We use the useUser hook to access authentication state
//   const { isLoaded, user } = useUser();
//   const { signOut } = useClerk();

//   // 1. Handle Loading State: If data isn't loaded yet, show spinner.
//   if (!isLoaded) {
//     return (
//       <View style={styles.container}>
//         <Stack.Screen options={{ title: 'Loading' }} />
//         <ActivityIndicator size="large" color="#007aff" />
//         <Text style={styles.loadingText}>Loading user data...</Text>
//       </View>
//     );
//   }

//   // 2. Handle Error / Signed Out State: If loaded, but the user object is missing.
//   // This explicitly catches the case where the 403 failure leaves 'user' as null/undefined.
//   if (!user) {
//     return (
//       <View style={styles.container}>
//         <Stack.Screen options={{ title: 'Error' }} />
//         <Text style={styles.errorText}>❌ Authentication Sync Failed (403)</Text>
//         <Text style={styles.errorSubtitle}>
//           The server rejected the connection. Check your Clerk Allowed Hostnames/Origins setting.
//         </Text>
//       </View>
//     );
//   }
  
//   // 3. Handle Signed In State (Only reached if 'user' is guaranteed to be defined)
//   // Accessing user properties is now safe.
//   return (
//     <View style={styles.container}>
//       <Stack.Screen options={{ title: 'User Profile' }} />
//       <Text style={styles.title}>Welcome, {user.firstName || user.username || 'User'}!</Text>
      
//       <View style={styles.infoContainer}>
//         <Text style={styles.label}>Full Name:</Text>
//         <Text style={styles.value}>{user.fullName || 'N/A'}</Text>
//         <Text style={styles.label}>Primary Email:</Text>
//         <Text style={styles.value}>
//           {user.primaryEmailAddress?.emailAddress || 'N/A'}
//         </Text>
//         <Text style={styles.label}>User ID:</Text>
//         <Text style={styles.value}>{user.id}</Text>
//       </View>

//       <TouchableOpacity 
//         onPress={() => signOut()} 
//         style={styles.signOutButton}
//       >
//         <Text style={styles.signOutText}>Sign Out</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 24,
//     backgroundColor: '#f8f8f8',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     marginBottom: 30,
//     color: '#333',
//   },
//   infoContainer: {
//     width: '90%',
//     padding: 20,
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//     marginBottom: 30,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#555',
//     marginTop: 10,
//   },
//   value: {
//     fontSize: 18,
//     color: '#000',
//     marginBottom: 5,
//   },
//   loadingText: {
//     marginTop: 15,
//     fontSize: 16,
//     color: '#555',
//   },
//   errorText: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#d9534f',
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   errorSubtitle: {
//     fontSize: 16,
//     color: '#777',
//     textAlign: 'center',
//   },
//   signOutButton: {
//     backgroundColor: '#007aff',
//     paddingVertical: 12,
//     paddingHorizontal: 30,
//     borderRadius: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 3,
//     elevation: 5,
//   },
//   signOutText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//   }
// });