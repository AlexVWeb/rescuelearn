<?php

namespace App\Repository;

use App\Entity\Referenciel;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ReferencielRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Referenciel::class);
    }

    public function findAll(): array
    {
        return $this->findBy([], ['year_edition' => 'DESC']);
    }
}