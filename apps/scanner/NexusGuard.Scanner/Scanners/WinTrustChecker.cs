using System.Runtime.InteropServices;

namespace NexusGuard.Scanner.Scanners;

// Calls the native WinVerifyTrust API (wintrust.dll) - the same trust-chain-plus-revocation
// check Windows Explorer's "Digital Signatures" tab and SmartScreen use internally. This is
// deliberately NOT reimplemented with managed X509Chain code: WinVerifyTrust is the one
// authority that correctly honors Authenticode counter-timestamps, so a binary signed years
// ago with a since-expired certificate still verifies as trusted, exactly as Windows itself
// treats it - reimplementing that nuance by hand risks exactly the kind of guessed-at false
// positive this project refuses to ship. Revocation checking (WTD_REVOKE_WHOLECHAIN) means
// this is the one scan step that can reach Microsoft's CRL/OCSP infrastructure over the
// network - every other scan step stays fully local/offline.
//
// Known, empirically-confirmed limitation: this only sees EMBEDDED Authenticode signatures.
// Many Windows OS binaries (confirmed via Get-AuthenticodeSignature: notepad.exe, getmac.exe)
// are signed via the separate system CATALOG mechanism instead, which plain
// WINTRUST_ACTION_GENERIC_VERIFY_V2/WTD_CHOICE_FILE does not consult - that needs the much
// larger CryptCATAdmin* catalog API, deliberately out of scope here. Callers must not run
// this against files under the Windows directory for that reason - see FileMetadataInspector.
public static class WinTrustChecker
{
    public enum SignatureTrust { Trusted, NoSignature, UntrustedRoot, Revoked, Expired, Tampered, Distrusted, Unknown }

    private static readonly Guid ActionGenericVerifyV2 = new("00AAC56B-CD44-11d0-8CC2-00C04FC295EE");

    private const uint WTD_UI_NONE = 2;
    private const uint WTD_REVOKE_WHOLECHAIN = 1;
    private const uint WTD_CHOICE_FILE = 1;
    private const uint WTD_STATEACTION_VERIFY = 1;
    private const uint WTD_STATEACTION_CLOSE = 2;
    private const uint WTD_SAFER_FLAG = 0x100;

    private const int ERROR_SUCCESS = 0;
    private static readonly int TRUST_E_NOSIGNATURE = unchecked((int)0x800B0100);
    private static readonly int TRUST_E_SUBJECT_NOT_TRUSTED = unchecked((int)0x800B0004);
    private static readonly int TRUST_E_EXPLICIT_DISTRUST = unchecked((int)0x800B0111);
    private static readonly int TRUST_E_BAD_DIGEST = unchecked((int)0x80096010);
    private static readonly int TRUST_E_PROVIDER_UNKNOWN = unchecked((int)0x800B0001);
    private static readonly int CERT_E_EXPIRED = unchecked((int)0x800B0101);
    private static readonly int CERT_E_REVOKED = unchecked((int)0x800B010C);
    private static readonly int CERT_E_UNTRUSTEDROOT = unchecked((int)0x800B0109);
    private static readonly int CRYPT_E_SECURITY_SETTINGS = unchecked((int)0x80092026);

    // Reference-type (class) marshaling, not a byref struct - empirically confirmed necessary:
    // a byref-struct version of this same P/Invoke silently misbehaved (always returned
    // TRUST_E_NOSIGNATURE, even for known-good embedded-signed files) despite matching the
    // documented WINTRUST_FILE_INFO/WINTRUST_DATA layouts field-for-field.
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private class WinTrustFileInfo
    {
        public uint StructSize = (uint)Marshal.SizeOf(typeof(WinTrustFileInfo));
        public IntPtr FilePath;
        public IntPtr hFile = IntPtr.Zero;
        public IntPtr pgKnownSubject = IntPtr.Zero;

        public WinTrustFileInfo(string filePath)
        {
            FilePath = Marshal.StringToCoTaskMemAuto(filePath);
        }

        public void Free()
        {
            if (FilePath != IntPtr.Zero) Marshal.FreeCoTaskMem(FilePath);
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    private class WinTrustDataNative
    {
        public uint StructSize = (uint)Marshal.SizeOf(typeof(WinTrustDataNative));
        public IntPtr PolicyCallbackData = IntPtr.Zero;
        public IntPtr SIPClientData = IntPtr.Zero;
        public uint UIChoice = WTD_UI_NONE;
        public uint RevocationChecks = WTD_REVOKE_WHOLECHAIN;
        public uint UnionChoice = WTD_CHOICE_FILE;
        public IntPtr FileInfoPtr;
        public uint StateAction = WTD_STATEACTION_VERIFY;
        public IntPtr StateData = IntPtr.Zero;
        public IntPtr URLReference = IntPtr.Zero;
        public uint ProvFlags = WTD_SAFER_FLAG;
        public uint UIContext = 0;
    }

    [DllImport("wintrust.dll", ExactSpelling = true, CharSet = CharSet.Unicode)]
    private static extern int WinVerifyTrust(IntPtr hwnd, [MarshalAs(UnmanagedType.LPStruct)] Guid pgActionID, [In] WinTrustDataNative pWVTData);

    // Never throws and never blocks the rest of a scan - an unreadable/deleted/locked file, a
    // locked-down environment, or a network hiccup on the revocation check all resolve to
    // Unknown rather than failing the caller.
    public static SignatureTrust Verify(string filePath)
    {
        WinTrustFileInfo? fileInfo = null;
        var fileInfoPtr = IntPtr.Zero;
        try
        {
            fileInfo = new WinTrustFileInfo(filePath);
            fileInfoPtr = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(WinTrustFileInfo)));
            Marshal.StructureToPtr(fileInfo, fileInfoPtr, false);

            var data = new WinTrustDataNative { FileInfoPtr = fileInfoPtr };

            int result;
            try
            {
                result = WinVerifyTrust(IntPtr.Zero, ActionGenericVerifyV2, data);
            }
            finally
            {
                // Always release the verification state WinVerifyTrust allocated, regardless
                // of the verdict - a leaked hWVTStateData handle here would accumulate across
                // every file in a scan.
                data.StateAction = WTD_STATEACTION_CLOSE;
                WinVerifyTrust(IntPtr.Zero, ActionGenericVerifyV2, data);
            }

            return MapResult(result);
        }
        catch
        {
            return SignatureTrust.Unknown;
        }
        finally
        {
            if (fileInfoPtr != IntPtr.Zero) Marshal.FreeHGlobal(fileInfoPtr);
            fileInfo?.Free();
        }
    }

    private static SignatureTrust MapResult(int result)
    {
        if (result == ERROR_SUCCESS) return SignatureTrust.Trusted;
        if (result == TRUST_E_NOSIGNATURE || result == TRUST_E_PROVIDER_UNKNOWN) return SignatureTrust.NoSignature;
        if (result == CERT_E_REVOKED) return SignatureTrust.Revoked;
        if (result == CERT_E_EXPIRED) return SignatureTrust.Expired;
        if (result == CERT_E_UNTRUSTEDROOT || result == CRYPT_E_SECURITY_SETTINGS) return SignatureTrust.UntrustedRoot;
        if (result == TRUST_E_BAD_DIGEST) return SignatureTrust.Tampered;
        if (result == TRUST_E_EXPLICIT_DISTRUST || result == TRUST_E_SUBJECT_NOT_TRUSTED) return SignatureTrust.Distrusted;
        return SignatureTrust.Unknown;
    }
}
