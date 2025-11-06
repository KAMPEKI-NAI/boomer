import {useClerk} from '@clerk/clerk-expo';
import {View, Text, Button } from 'react-native';

const HomeScreen = () => {
    const { signOut, user } = useClerk();

    return (
        <View>
            <Text>Home Screen</Text>

            <Button onPress={() => signOut()} title="logout"></Button>
        </View>
    );
};

export default HomeScreen;