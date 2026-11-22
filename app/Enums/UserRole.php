<?php

namespace App\Enums;

enum UserRole: string
{
    case Employee = 'EMPLOYEE';
    case Manager = 'MANAGER';
}
