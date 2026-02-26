import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MfaSetup = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verifiedTotps = data.totp.filter(f => f.status === 'verified');
      setMfaEnabled(verifiedTotps.length > 0);
      if (verifiedTotps.length > 0) {
        setFactorId(verifiedTotps[0].id);
      }
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      // Unenroll any unverified factors first
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp) {
        for (const factor of factors.totp.filter(f => f.status === 'unverified')) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'NH SwiftPass Admin TOTP',
      });
      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to start MFA enrollment', variant: 'destructive' });
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast({ title: 'Invalid Code', description: 'Please enter a 6-digit code', variant: 'destructive' });
      return;
    }
    try {
      setVerifying(true);
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      setMfaEnabled(true);
      setQrCode('');
      setSecret('');
      setVerifyCode('');
      toast({ title: '2FA Enabled', description: 'Two-factor authentication is now active on your account.' });
    } catch (error: any) {
      toast({ title: 'Verification Failed', description: error.message || 'Invalid code. Please try again.', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async () => {
    try {
      setUnenrolling(true);
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      setMfaEnabled(false);
      setFactorId('');
      toast({ title: '2FA Disabled', description: 'Two-factor authentication has been removed from your account.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to disable 2FA', variant: 'destructive' });
    } finally {
      setUnenrolling(false);
    }
  };

  if (loading) {
    return (
      <Card className="toll-card">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="toll-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-highway-blue" />
            <CardTitle className="text-highway-blue">Two-Factor Authentication</CardTitle>
          </div>
          {mfaEnabled ? (
            <Badge className="bg-green-500 text-white"><ShieldCheck className="h-3 w-3 mr-1" /> Enabled</Badge>
          ) : (
            <Badge variant="secondary"><ShieldOff className="h-3 w-3 mr-1" /> Disabled</Badge>
          )}
        </div>
        <CardDescription>
          Secure your admin account with TOTP-based two-factor authentication
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mfaEnabled && !qrCode && (
          <div className="space-y-4">
            <p className="text-sm text-green-600 font-medium">
              ✓ 2FA is active. You'll be asked for a verification code each time you log in.
            </p>
            <Button variant="destructive" onClick={handleUnenroll} disabled={unenrolling}>
              {unenrolling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Disabling...</> : 'Disable 2FA'}
            </Button>
          </div>
        )}

        {!mfaEnabled && !qrCode && (
          <Button onClick={handleEnroll} disabled={enrolling} className="highway-gradient text-white">
            {enrolling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting up...</> : 'Enable 2FA'}
          </Button>
        )}

        {qrCode && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">1. Scan this QR code with your authenticator app:</p>
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48" />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Or manually enter this secret:</p>
              <code className="block p-2 bg-muted rounded text-xs break-all select-all">{secret}</code>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totp-code">2. Enter the 6-digit code from your app:</Label>
              <div className="flex gap-2">
                <Input
                  id="totp-code"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="max-w-[160px] text-center text-lg tracking-widest"
                />
                <Button onClick={handleVerify} disabled={verifying || verifyCode.length !== 6} className="highway-gradient text-white">
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Enable'}
                </Button>
              </div>
            </div>
            <Button variant="ghost" onClick={() => { setQrCode(''); setSecret(''); setVerifyCode(''); }}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MfaSetup;
