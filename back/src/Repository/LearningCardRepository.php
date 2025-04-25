<?php

namespace App\Repository;

use App\Entity\LearningCard;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class LearningCardRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LearningCard::class);
    }

    public function findDistinctThemes(): array
    {
        return $this->createQueryBuilder('lc')
            ->select('DISTINCT lc.theme')
            ->orderBy('lc.theme', 'ASC')
            ->getQuery()
            ->getSingleColumnResult();
    }

    public function findDistinctNiveaux(): array
    {
        return $this->createQueryBuilder('lc')
            ->select('DISTINCT lc.niveau')
            ->orderBy('lc.niveau', 'ASC')
            ->getQuery()
            ->getSingleColumnResult();
    }

    public function findByTheme(string $theme): array
    {
        return $this->createQueryBuilder('lc')
            ->where('lc.theme = :theme')
            ->setParameter('theme', urldecode($theme))
            ->getQuery()
            ->getResult();
    }

    public function findByNiveau(string $niveau): array
    {
        return $this->createQueryBuilder('lc')
            ->where('lc.niveau = :niveau')
            ->setParameter('niveau', urldecode($niveau))
            ->getQuery()
            ->getResult();
    }
} 