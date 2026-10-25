import { Image, View } from 'react-native';
import { useViewableUrl } from '../lib/storage-url';

// An Image whose `uri` may point at a private bucket (see lib/storage-url).
export default function StorageImage({ uri, style, ...props }) {
  const link = useViewableUrl(uri);

  if (!link) return <View style={style} />;

  return <Image {...props} source={{ uri: link }} style={style} />;
}
