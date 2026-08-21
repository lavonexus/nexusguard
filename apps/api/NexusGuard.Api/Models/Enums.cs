namespace NexusGuard.Api.Models;

public enum ScanSessionStatus
{
    Pending,      // scan created by admin, waiting for scanner to exchange the PIN
    TokenIssued,  // PIN exchanged, scanner has a live scan token
    InProgress,   // scanner has started sending results
    Completed,    // scanner reported completion
    Expired,      // PIN or token expired before use
    Failed,       // scanner reported a failure
    Cancelled     // admin cancelled the scan
}

public enum ScanResultType
{
    System,
    Process,
    File,
    Hash,
    Module,
    Registry,
    EventLog,
    FiveMArtifact,
    Rpf,
    UsbHistory,
    FileEvidence,
    Autostart,
    ScheduledTask,
    Service,
    InstalledApplication,
    Firmware,
    Steam,
    Shimcache,
    Driver,
    HostsFile,
    Prefetch,
    Amcache
}

public enum SupportTicketStatus
{
    Open,
    Closed
}
