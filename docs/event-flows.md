# Quizexe Event Flow Diagrams

## Game Lifecycle Overview

```mermaid
stateDiagram-v2
    [*] --> RoomCreation: Host creates room
    RoomCreation --> Waiting: Room code generated
    Waiting --> Active: Guest joins (2 players)
    Active --> Finished: All questions answered
    Active --> Abandoned: Disconnect/timeout
    Waiting --> Abandoned: No guest joins (30min)
    Finished --> [*]: Match summary generated
    Abandoned --> [*]: Cleanup
```

## Detailed Player Flow

### Host Flow
```mermaid
sequenceDiagram
    participant Host
    participant Frontend
    participant EdgeFunction
    participant Database
    participant Realtime

    Host->>Frontend: Enter display name + settings
    Frontend->>EdgeFunction: POST /create-room
    EdgeFunction->>Database: INSERT player, room, match
    Database-->>EdgeFunction: Room code (6-char)
    EdgeFunction-->>Frontend: Room details
    Frontend->>Realtime: Subscribe to match updates
    Frontend-->>Host: Display room code
    Note over Host: Waiting for guest...
    Realtime-->>Frontend: player2_joined event
    Frontend-->>Host: Game starting!
    EdgeFunction->>Database: UPDATE match status='active'
    EdgeFunction->>Database: INSERT match_questions (ordered)
    Realtime-->>Frontend: Question 1 data
    Frontend-->>Host: Display question
```

### Guest Flow
```mermaid
sequenceDiagram
    participant Guest
    participant Frontend
    participant EdgeFunction
    participant Database
    participant Realtime

    Guest->>Frontend: Enter display name + room code
    Frontend->>EdgeFunction: POST /join-room
    EdgeFunction->>Database: Validate room exists
    EdgeFunction->>Database: INSERT player, UPDATE match
    EdgeFunction->>Database: SELECT random questions
    EdgeFunction->>Database: INSERT match_questions (ordered)
    EdgeFunction->>Database: UPDATE match status='active'
    Database-->>EdgeFunction: Match details
    EdgeFunction-->>Frontend: Match + Question 1
    Frontend->>Realtime: Subscribe to match updates
    Realtime-->>Frontend: Broadcast to both players
    Frontend-->>Guest: Display question
```

## Question Answering Flow

```mermaid
sequenceDiagram
    participant Player
    participant Frontend
    participant EdgeFunction
    participant Database
    participant Realtime

    Note over Player,Frontend: Timer starts (client-side)
    Player->>Frontend: Select answer
    Frontend->>EdgeFunction: POST /submit-answer
    Note over EdgeFunction: Server validates time
    EdgeFunction->>Database: Check duplicate answer
    EdgeFunction->>Database: Validate correct answer
    EdgeFunction->>Database: Calculate score (base + bonus + streak)
    EdgeFunction->>Database: INSERT player_answers
    EdgeFunction->>Database: INSERT match_scores
    Database-->>EdgeFunction: Score data
    EdgeFunction->>Realtime: Broadcast score update
    Realtime-->>Frontend: Both players receive update
    Frontend-->>Player: Show feedback (correct/incorrect)
    Note over Frontend: Wait 2s, load next question
    Frontend->>Database: SELECT next question by order
    Frontend-->>Player: Display next question
```

## Scoring Calculation (Server-Side)

```mermaid
flowchart TD
    A[Answer Submitted] --> B{Time Valid?}
    B -->|No| C[Reject: Too Late]
    B -->|Yes| D{Already Answered?}
    D -->|Yes| E[Reject: Duplicate]
    D -->|No| F{Correct Answer?}
    F -->|No| G[Base: 0 points<br/>Reset streak]
    F -->|Yes| H[Base: 100 points]
    H --> I[Calculate Time Bonus<br/>0-50 pts linear decay]
    I --> J{Current Streak?}
    J -->|0-1| K[Multiplier: 1.0x]
    J -->|2| L[Multiplier: 1.1x]
    J -->|3+| M[Multiplier: 1.3x cap]
    K --> N[Total = Base + Bonus × Multiplier]
    L --> N
    M --> N
    G --> O[Store in player_answers]
    N --> O
    O --> P[Update match_scores]
    P --> Q[Broadcast to Realtime]
    Q --> R{All questions done?}
    R -->|No| S[Continue]
    R -->|Yes| T[Update match status='finished']
    T --> U[Trigger match_summary generation]
```

## Latency Compensation

```mermaid
flowchart LR
    A[Question Start Time] --> B[+ Time Limit]
    B --> C[+ 200ms Buffer]
    C --> D{Submission Time <= Deadline?}
    D -->|Yes| E[Accept Answer]
    D -->|No| F[Reject: Too Late]
    
    style C fill:#90EE90
    style E fill:#90EE90
    style F fill:#FFB6C1
```

## Match Completion Flow

```mermaid
sequenceDiagram
    participant Player1
    participant Player2
    participant EdgeFunction
    participant Database
    participant Trigger

    Player1->>EdgeFunction: Submit final answer
    EdgeFunction->>Database: INSERT player_answers
    EdgeFunction->>Database: INSERT match_scores
    Note over Database: Check if both players done
    Database-->>EdgeFunction: All questions answered
    EdgeFunction->>Database: UPDATE match status='finished'
    Database->>Trigger: generate_match_summary()
    Trigger->>Database: Calculate stats
    Trigger->>Database: Determine winner (tie-breaker: time)
    Trigger->>Database: INSERT match_summaries
    Database-->>EdgeFunction: Match complete
    EdgeFunction-->>Player1: Redirect to results
    EdgeFunction-->>Player2: Redirect to results
```

## Reconnection Handling

```mermaid
flowchart TD
    A[Player Disconnects] --> B[Realtime detects]
    B --> C{Match Status?}
    C -->|waiting| D[Show "Opponent disconnected"]
    C -->|active| E[Continue game for connected player]
    C -->|finished| F[Show results]
    E --> G[Player Reconnects]
    G --> H[Frontend checks match_id in localStorage]
    H --> I[Query current question by order]
    I --> J[Query current scores]
    J --> K[Resume at correct question]
    K --> L[Sync timer from server]
    
    style K fill:#90EE90
```

## Cleanup & Expiration

```mermaid
flowchart TD
    A[Cron: Every 15 min] --> B[Query rooms WHERE expires_at < NOW]
    B --> C[DELETE expired rooms]
    C --> D[Cascade: matches, scores, answers]
    A --> E[Query matches WHERE status='waiting']
    E --> F{Created > 30min ago?}
    F -->|Yes| G[UPDATE status='abandoned']
    A --> H[Query matches WHERE status='active']
    H --> I{No activity > 2hr?}
    I -->|Yes| J[UPDATE status='abandoned']
    
    style G fill:#FFB6C1
    style J fill:#FFB6C1
```

## Anti-Cheat Validation

```mermaid
flowchart TD
    A[Answer Submission] --> B{Timestamp Valid?<br/>submission <= start + limit + 200ms}
    B -->|No| C[Log + Reject]
    B -->|Yes| D{Unique Answer?<br/>Check player_answers}
    D -->|Duplicate| E[Log + Reject]
    D -->|Unique| F{Answer Index Valid?<br/>0-3 range}
    F -->|No| G[Log + Reject]
    F -->|Yes| H[Process Score]
    H --> I[Store in Audit Log]
    
    style C fill:#FFB6C1
    style E fill:#FFB6C1
    style G fill:#FFB6C1
    style I fill:#90EE90
```

## Database Trigger Flow

```mermaid
flowchart LR
    A[Match Status Updated] --> B{New Status = 'finished'?}
    B -->|No| C[No Action]
    B -->|Yes| D[Calculate Player 1 Stats]
    D --> E[Calculate Player 2 Stats]
    E --> F[Determine Winner<br/>Tie-breaker: avg time]
    F --> G[Calculate Accuracy %]
    G --> H[Calculate Duration]
    H --> I[INSERT match_summaries]
    
    style I fill:#90EE90
```

## Realtime Event Types

### Database Changes (Supabase Realtime)
- `matches` table: `status` updates (waiting → active → finished)
- `match_scores` table: Score updates after each answer
- `player_answers` table: Answer submissions (for opponent feedback)

### Broadcast Channels (Ephemeral)
- `match:{match_id}:timer` - Timer synchronization
- `match:{match_id}:presence` - Player connection status
- `match:{match_id}:events` - Game events (question transitions, etc.)

## Security Boundaries

```mermaid
flowchart TD
    A[Client] -->|Sends Intent| B[Edge Function]
    B -->|Validates| C{Valid Request?}
    C -->|No| D[Return Error]
    C -->|Yes| E[Server Calculates]
    E --> F[Update Database]
    F --> G[Broadcast Result]
    G --> H[Client Renders]
    
    style B fill:#FFD700
    style E fill:#FFD700
    style F fill:#FFD700
    
    Note1[Client NEVER controls:<br/>- Scores<br/>- Time validation<br/>- Correct answers]
    Note2[Server Authority:<br/>- All game logic<br/>- Score calculation<br/>- State transitions]
```
