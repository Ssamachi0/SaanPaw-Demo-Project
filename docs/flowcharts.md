# Module Flowcharts (Figures 21-23)

## Figure 21 - Developer Module Flowchart

```mermaid
flowchart TD
    S([Start]) --> L[Open app -> Developer Login]
    L --> V{Valid developer\ncredentials?}
    V -- No --> L
    V -- Yes --> D[Developer Dashboard\n(daily lost/found stats)]
    D --> C{Choose action}
    C --> SA[Shelter Approval Management]
    SA --> SA1[Review pending shelter registration]
    SA1 --> SA2{Credentials verified\nwith LGU?}
    SA2 -- Yes --> SA3[Approve -> issue credentials]
    SA2 -- No --> SA4[Reject with reason]
    C --> SM[System Management\n(config, DB monitor, updates, deploy)]
    C --> RM[Report Monitoring]
    RM --> RM1[View AI-flagged reports]
    RM1 --> RM2{Report false /\ninappropriate?}
    RM2 -- Yes --> RM3[Remove report]
    RM3 --> RM4{Account exceeds\nflag threshold?}
    RM4 -- Yes --> RM5[Ban account]
    RM4 -- No --> D
    RM2 -- No --> D
    SA3 --> D
    SA4 --> D
    SM --> D
    RM5 --> D
    D --> E([Logout / End])
```

## Figure 22 - Shelter Admin Module Flowchart

```mermaid
flowchart TD
    S([Start]) --> R{Has approved\ncredentials?}
    R -- No --> REG[Register: shelter details + operating radius]
    REG --> W[Wait for Developer approval]
    W --> R
    R -- Yes --> L[Shelter Admin Login]
    L --> V{Valid?}
    V -- No --> L
    V -- Yes --> D[Shelter Dashboard\n(active reports, rescued, ongoing)]
    D --> C{Choose action}
    C --> AM[Shelter Animals Management\n(add animals in care)]
    C --> RA[Recovered Animals Posting]
    C --> AR[Animal Report Management\n(lost/found within radius)]
    AR --> AR1[Open a report]
    AR1 --> AS[Animal Status Management\nunder_rescue / reunited / adopted / inconclusive]
    C --> MB[Message Box\n(chat with reporting user)]
    C --> PR[Shelter Profile Management]
    C --> NM[Notification Management\n(smart alerts in radius)]
    AS --> D
    AM --> D
    RA --> D
    MB --> D
    PR --> D
    NM --> D
    D --> E([Logout / End])
```

## Figure 23 - User Module Flowchart

```mermaid
flowchart TD
    S([Start]) --> A{Has account?}
    A -- No --> REG[Registration + choose alert radius]
    REG --> L[Login]
    A -- Yes --> L
    L --> V{Valid?}
    V -- No --> L
    V -- Yes --> D[User Dashboard\n(daily lost/found stats)]
    D --> C{Choose action}
    C --> RL[Report Lost Pet\n(upload images + details + location)]
    RL --> GF{Location inside\nSan Jose Del Monte?}
    GF -- No --> RLx[Reject: outside service area]
    GF -- Yes --> IR[Image Recognition Matching\n(suggest candidate found animals)]
    IR --> AL[Smart Alert fan-out to\nnearby users + shelters in radius]
    C --> RF[Report Found Animal\n(upload images + description + location)]
    RF --> GF
    C --> SU[Reported Lost Pet Status Update]
    C --> SV[Shelter View\n(browse shelter animals, chat)]
    C --> MV[Map View Interface\n(reported cases on map)]
    C --> SF[Search and Filter Reports\n(type / date / location)]
    C --> NT[Smart Notifications feed]
    AL --> D
    RLx --> D
    SU --> D
    SV --> D
    MV --> D
    SF --> D
    NT --> D
    D --> E([Logout / End])
```
