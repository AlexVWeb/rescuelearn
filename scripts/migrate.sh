#!/bin/bash
read -p "Nom de la migration: " name
bunx prisma migrate dev --name "$name"