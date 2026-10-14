import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '../theme/AppTheme';
import { Channel, groupMeta } from '../data/channels';

interface ChannelLogoProps {
  channel: Channel;
  size?: number;
}

/**
 * Channel artwork with a graceful fallback: when a playlist logo is missing or fails to
 * load, the channel initials are drawn on the category colour instead of an empty box.
 */
const ChannelLogo: React.FC<ChannelLogoProps> = ({ channel, size = 46 }) => {
  const [failed, setFailed] = useState(false);
  const meta = groupMeta(channel.group);
  const initials = (channel.name || 'A').trim().slice(0, 2).toUpperCase();

  if (channel.logo && !failed) {
    return (
      <View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
            backgroundColor: 'rgba(255,255,255,0.06)',
          },
        ]}
      >
        <Image
          source={{ uri: channel.logo }}
          style={{ width: size * 0.76, height: size * 0.76 }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: meta.color + '26',
          borderWidth: 1,
          borderColor: meta.color + '59',
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38, color: meta.color }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: AppTheme.typography.fontWeight.extrabold,
    letterSpacing: 0.5,
  },
});

export default ChannelLogo;
                  
