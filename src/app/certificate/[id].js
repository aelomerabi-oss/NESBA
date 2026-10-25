import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../../constants/theme';

import {
  getCertificateById,
} from '../../lib/learning';

import { SITE_URL } from '../../lib/payments';
import { shareLink } from '../../lib/share-link';
import { usePageMeta } from '../../lib/page-meta';

import {
  supabase,
} from '../../lib/supabase';


export default function CertificateScreen() {
  // new=1 when the learner arrives straight from finishing the course.
  const { id, new: justEarned } = useLocalSearchParams();

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  usePageMeta(
    cert ? `${cert.profiles?.full_name || 'NESBA'} · ${cert.courses?.title || 'Certificate'}` : null,
    cert ? `Verified NESBA certificate for completing ${cert.courses?.title || 'a course'}.` : null
  );


  /*
   * ============================================
   * LOAD CERTIFICATE
   * ============================================
   */

  useEffect(() => {
    const loadCertificate = async () => {
      try {
        const certificate =
          await getCertificateById(id);

        setCert(certificate);

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        const ownerId =
          certificate?.user_id;

        const owner =
          Boolean(
            user?.id &&
            ownerId &&
            user.id === ownerId
          );

        setIsOwner(owner);

        console.log(
          'CERTIFICATE OWNER DEBUG:',
          {
            loggedInUserId:
              user?.id,

            certificateOwnerId:
              ownerId,

            certificateId:
              certificate?.id,

            certificateName:
              certificate
                ?.profiles
                ?.full_name,

            isOwner:
              owner,
          }
        );

      } catch (e) {
        console.error(
          'Could not load certificate:',
          e
        );

        setError(
          e.message
        );

      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadCertificate();
    }
  }, [id]);


  /*
   * ============================================
   * BACK
   * ============================================
   */

  const handleBack = () => {
    try {
      if (
        router.canGoBack()
      ) {
        router.back();
      } else {
        router.replace(
          '/(tabs)'
        );
      }
    } catch (e) {
      router.replace(
        '/(tabs)'
      );
    }
  };


  /*
   * ============================================
   * CERTIFICATE HTML
   * ============================================
   */

  const buildCertificateHtml = () => `
    <html>
      <body
        style="
          font-family:-apple-system,Arial,sans-serif;
          background:#0F1220;
          padding:60px;
          text-align:center;
        "
      >

        <div
          style="
            max-width:480px;
            margin:0 auto;
            background:#181C2E;
            border:2px solid #F5B942;
            border-radius:20px;
            padding:48px;
          "
        >

          <div
            style="
              font-size:32px;
              font-weight:800;
              color:#F5B942;
              margin-bottom:16px;
            "
          >
            NESBA
          </div>

          <div
            style="
              color:#9AA0B4;
              font-size:13px;
              margin-bottom:24px;
            "
          >
            National Entrepreneurship & Small Business Academy
          </div>

          <div
            style="
              color:#9AA0B4;
              font-size:14px;
            "
          >
            This certifies that
          </div>

          <div
            style="
              color:#F5F6FA;
              font-size:24px;
              font-weight:800;
              margin:8px 0;
            "
          >
            ${cert.profiles?.full_name || ''}
          </div>

          <div
            style="
              color:#9AA0B4;
              font-size:14px;
            "
          >
            has successfully completed
          </div>

          <div
            style="
              color:#8A7CF0;
              font-size:20px;
              font-weight:700;
              margin:8px 0 4px;
            "
          >
            ${cert.courses?.title || ''}
          </div>

          <div
            style="
              color:#9AA0B4;
              font-size:13px;
              margin-bottom:24px;
            "
          >
            Instructed by
            ${cert.courses?.teacher_name || ''}
          </div>

          <hr
            style="
              border-color:#2C3150;
              margin:24px 0;
            "
          />

          <div
            style="
              display:flex;
              justify-content:space-between;
              font-size:12px;
              color:#F5F6FA;
            "
          >

            <div>
              <div style="color:#9AA0B4;">
                Issued
              </div>

              ${new Date(
                cert.issued_at
              ).toLocaleDateString()}
            </div>

            <div>
              <div style="color:#9AA0B4;">
                Certificate ID
              </div>

              ${cert.certificate_id}
            </div>

          </div>

        </div>

      </body>
    </html>
  `;


  /*
   * ============================================
   * DOWNLOAD PDF
   * ============================================
   */

  const handleDownloadPdf = async () => {

    if (!isOwner) {
      Alert.alert(
        'Not available',
        'Only the person who earned this certificate can download or share it.'
      );

      return;
    }

    setWorking(true);

    try {
      const html =
        buildCertificateHtml();

      if (
        Platform.OS === 'web'
      ) {

        await Print.printAsync({
          html,
        });

      } else {

        const {
          uri,
        } =
          await Print.printToFileAsync({
            html,
          });

        if (
          await Sharing.isAvailableAsync()
        ) {

          await Sharing.shareAsync(
            uri,
            {
              mimeType:
                'application/pdf',

              dialogTitle:
                'Share your NESBA certificate',
            }
          );

        } else {

          Alert.alert(
            'Saved',
            'PDF created but sharing is not available on this device.'
          );

        }
      }

    } catch (e) {

      Alert.alert(
        'Could not create PDF',
        e.message
      );

    } finally {

      setWorking(false);

    }
  };


  /*
   * ============================================
   * SHARE
   * ============================================
   *
   * Anyone with the link can open and verify
   * the certificate.
   */

  const certificateUrl = () =>
    `${SITE_URL}/certificate/${cert.certificate_id}`;

  const shareMessage = () =>
    `I just completed "${cert.courses?.title || 'a course'}" on NESBA and earned my certificate! 🎓`;

  const handlePostOnLinkedIn = () => {
    const text =
      `${shareMessage()}

NESBA teaches practical business skills from people who have built a business.

Verify my certificate: ${certificateUrl()}`;

    Linking.openURL(
      `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`
    ).catch(() =>
      Alert.alert('Could not open LinkedIn', 'Use Share instead.')
    );
  };

  const handleShare = () =>
    shareLink({
      title: 'My NESBA certificate',
      message: shareMessage(),
      url: certificateUrl(),
    });


  /*
   * ============================================
   * LINKEDIN
   * ============================================
   */

  const handleAddToLinkedIn = () => {

    if (!isOwner) {
      Alert.alert(
        'Not available',
        'Only the person who earned this certificate can add it to LinkedIn.'
      );

      return;
    }

    const issued =
      new Date(
        cert.issued_at
      );

    const params =
      new URLSearchParams({
        startTask:
          'CERTIFICATION_NAME',

        name:
          cert.courses?.title ||
          'NESBA Certificate',

        organizationName:
          'NESBA',

        issueYear:
          String(
            issued.getFullYear()
          ),

        issueMonth:
          String(
            issued.getMonth() + 1
          ),

        certId:
          cert.certificate_id,

        certUrl:
          certificateUrl(),
      });

    Linking.openURL(
      `https://www.linkedin.com/profile/add?${params.toString()}`
    );
  };


  /*
   * ============================================
   * LOADING
   * ============================================
   */

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >

        <ActivityIndicator
          color={
            colors.primary
          }
        />

      </View>
    );
  }


  /*
   * ============================================
   * ERROR
   * ============================================
   */

  if (
    error ||
    !cert
  ) {

    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >

        <Pressable
          style={
            styles.backButton
          }
          onPress={
            handleBack
          }
        >

          <Ionicons
            name="arrow-back"
            size={22}
            color={
              colors.text
            }
          />

          <Text
            style={
              styles.backText
            }
          >
            Back
          </Text>

        </Pressable>

        <Ionicons
          name="close-circle-outline"
          size={40}
          color={
            colors.danger
          }
        />

        <Text
          style={
            styles.notFoundText
          }
        >
          Certificate not found or invalid.
        </Text>

      </View>
    );
  }


  /*
   * ============================================
   * MAIN SCREEN
   * ============================================
   */

  return (
    <ScrollView
      style={
        styles.scroll
      }
      contentContainerStyle={
        styles.scrollContent
      }
    >

      {/* BACK */}

      <Pressable
        style={
          styles.backButton
        }
        onPress={
          handleBack
        }
      >

        <Ionicons
          name="arrow-back"
          size={22}
          color={
            colors.text
          }
        />

        <Text
          style={
            styles.backText
          }
        >
          Back
        </Text>

      </Pressable>


      <View
        style={
          styles.centerContent
        }
      >

        {isOwner && justEarned === '1' ? (
          <View
            style={
              styles.celebrate
            }
          >
            <Text
              style={
                styles.celebrateTitle
              }
            >
              🎉 Congratulations!
            </Text>

            <Text
              style={
                styles.celebrateText
              }
            >
              You finished the course. Share your certificate so your network sees what you learned.
            </Text>
          </View>
        ) : null}

        {/* CERTIFICATE */}

        <View
          style={
            styles.card
          }
        >

          <Image accessibilityLabel="NESBA logo"
            source={require(
              '../../assets/images/nesba-logo.png'
            )}
            style={
              styles.logo
            }
          />

          <Ionicons
            name="ribbon"
            size={32}
            color={
              colors.premium
            }
            style={{
              marginTop:
                spacing.sm,
            }}
          />

          <Text
            style={
              styles.certifies
            }
          >
            This certifies that
          </Text>

          <Text
            style={
              styles.name
            }
          >
            {
              cert.profiles
                ?.full_name
            }
          </Text>

          <Text
            style={
              styles.certifies
            }
          >
            has successfully completed
          </Text>

          <Text
            style={
              styles.course
            }
          >
            {
              cert.courses
                ?.title
            }
          </Text>

          <Text
            style={
              styles.teacher
            }
          >
            Instructed by{' '}
            {
              cert.courses
                ?.teacher_name
            }
          </Text>


          <View
            style={
              styles.divider
            }
          />


          <View
            style={
              styles.footerRow
            }
          >

            <View>
              <Text
                style={
                  styles.footerLabel
                }
              >
                Issued
              </Text>

              <Text
                style={
                  styles.footerValue
                }
              >
                {new Date(
                  cert.issued_at
                ).toLocaleDateString()}
              </Text>
            </View>


            <View>
              <Text
                style={
                  styles.footerLabel
                }
              >
                Certificate ID
              </Text>

              <Text
                style={
                  styles.footerValue
                }
              >
                {
                  cert.certificate_id
                }
              </Text>
            </View>

          </View>


          <View
            style={
              styles.verifiedBadge
            }
          >

            <Ionicons
              name="checkmark-circle"
              size={14}
              color={
                colors.success
              }
            />

            <Text
              style={
                styles.verifiedText
              }
            >
              Verified by NESBA
            </Text>

          </View>

        </View>


        {/* OWNER ONLY */}

        {isOwner ? (
          <>

            <Pressable
              style={
                styles.linkedinBtn
              }
              onPress={
                handleAddToLinkedIn
              }
            >

              <Ionicons
                name="logo-linkedin"
                size={18}
                color="#fff"
              />

              <Text
                style={
                  styles.linkedinBtnText
                }
              >
                Add to LinkedIn Profile
              </Text>

            </Pressable>


            <Pressable
              style={
                styles.downloadBtn
              }
              onPress={
                handlePostOnLinkedIn
              }
            >
              <Ionicons
                name="logo-linkedin"
                size={18}
                color="#0A66C2"
              />

              <Text
                style={
                  styles.downloadBtnText
                }
              >
                Post about it on LinkedIn
              </Text>
            </Pressable>


            <Pressable
              style={
                styles.downloadBtn
              }
              onPress={
                handleShare
              }
            >
              <Ionicons
                name="share-social-outline"
                size={18}
                color={
                  colors.text
                }
              />

              <Text
                style={
                  styles.downloadBtnText
                }
              >
                Share with friends
              </Text>
            </Pressable>


            <Pressable
              style={
                styles.downloadBtn
              }
              onPress={
                handleDownloadPdf
              }
              disabled={
                working
              }
            >

              {working ? (

                <ActivityIndicator
                  color={
                    colors.text
                  }
                />

              ) : (

                <>
                  <Ionicons
                    name="download-outline"
                    size={18}
                    color={
                      colors.text
                    }
                  />

                  <Text
                    style={
                      styles.downloadBtnText
                    }
                  >
                    Download as PDF
                  </Text>
                </>

              )}

            </Pressable>

          </>
        ) : null}

      </View>

    </ScrollView>
  );
}


const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        colors.background,
      padding:
        spacing.md,
    },


    center: {
      justifyContent:
        'center',
      alignItems:
        'center',
    },


    scroll: {
      flex: 1,
      backgroundColor:
        colors.background,
    },


    scrollContent: {
      flexGrow: 1,
      padding:
        spacing.md,
    },


    celebrate: {
      width: '100%',
      maxWidth: 420,
      backgroundColor:
        colors.primarySoft,
      borderRadius:
        radius.md,
      padding:
        spacing.md,
      marginBottom:
        spacing.md,
      gap: 4,
    },


    celebrateTitle: {
      ...typography.body,
      fontWeight:
        '800',
      fontSize: 18,
    },


    celebrateText: {
      ...typography.body,
      color:
        colors.textSecondary,
    },


    centerContent: {
      flexGrow: 1,
      width: '100%',
      justifyContent:
        'center',
      alignItems:
        'center',
    },


    backButton: {
      flexDirection:
        'row',
      alignItems:
        'center',
      alignSelf:
        'flex-start',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 4,
      zIndex: 10,
    },


    backText: {
      ...typography.body,
      color:
        colors.text,
      fontWeight:
        '600',
    },


    notFoundText: {
      ...typography.body,
      color:
        colors.textMuted,
      marginTop:
        spacing.sm,
      textAlign:
        'center',
    },


    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor:
        colors.surface,
      borderRadius:
        radius.lg,
      padding:
        spacing.xl,
      alignItems:
        'center',
      borderWidth: 1,
      borderColor:
        colors.premium,
    },


    logo: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },


    certifies: {
      ...typography.caption,
      marginTop:
        spacing.md,
    },


    name: {
      ...typography.h1,
      fontSize: 22,
      marginTop: 4,
      textAlign:
        'center',
    },


    course: {
      ...typography.h2,
      fontSize: 18,
      marginTop: 4,
      textAlign:
        'center',
      color:
        colors.primaryLight,
    },


    teacher: {
      ...typography.caption,
      marginTop: 4,
    },


    divider: {
      height: 1,
      backgroundColor:
        colors.border,
      width: '100%',
      marginVertical:
        spacing.lg,
    },


    footerRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      width: '100%',
    },


    footerLabel: {
      ...typography.caption,
      fontSize: 11,
    },


    footerValue: {
      ...typography.body,
      fontWeight:
        '600',
      fontSize: 13,
      marginTop: 2,
    },


    verifiedBadge: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
      marginTop:
        spacing.lg,
    },


    verifiedText: {
      color:
        colors.success,
      fontSize: 12,
      fontWeight:
        '600',
    },


    linkedinBtn: {
      flexDirection:
        'row',
      gap: 8,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#0A66C2',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius:
        radius.md,
      marginTop:
        spacing.lg,
      width: '100%',
      maxWidth: 420,
    },


    linkedinBtnText: {
      color:
        '#fff',
      fontWeight:
        '700',
      fontSize: 14,
    },


    downloadBtn: {
      flexDirection:
        'row',
      gap: 8,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius:
        radius.md,
      marginTop:
        spacing.sm,
      width: '100%',
      maxWidth: 420,
    },


    downloadBtnText: {
      color:
        colors.text,
      fontWeight:
        '700',
      fontSize: 14,
    },

  });