<?php

namespace App\Enums;

enum HistoryAction: string
{
    case Created = 'CREATED';
    case Edited = 'EDITED';
    case Submitted = 'SUBMITTED';
    case Approved = 'APPROVED';
    case Rejected = 'REJECTED';
}
